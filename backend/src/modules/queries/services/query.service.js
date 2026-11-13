import { ApiError } from '../../../lib/api-error.js'
import { logActivity } from '../../employees/services/activity.service.js'
import Employee from '../../employees/models/employee.model.js'
import EmployeeQuery from '../models/employee-query.model.js'
import Task from '../../tasks/models/task.model.js'
import { validateQueryCreate, validateQueryReview } from '../validators/query.validator.js'

export const initialQueryStatus = (repeatsTask) => (repeatsTask ? 'raised_again' : 'open')

/** Transport shape: GridFS ids become authenticated resource paths. */
function serializeAttachments(attachments = []) {
  return attachments.map((attachment) => {
    const value = String(attachment)
    if (/^https?:\/\//i.test(value)) {
      const name = value.split('?')[0].split('/').pop() || 'Attachment'
      return { name, fileId: null, url: value }
    }
    return { name: 'Attachment', fileId: value, url: `/api/v1/files/${value}` }
  })
}

export function serializeQuery(query) {
  if (!query) return query
  const plain = typeof query.toObject === 'function' ? query.toObject() : { ...query }
  plain.attachments = serializeAttachments(plain.attachments || [])
  return plain
}

const QUERY_POPULATE = [
  { path: 'employee', select: 'firstName lastName employeeCode department designation' },
  { path: 'task', select: 'taskId title status' },
  { path: 'reviewedBy', select: 'firstName lastName employeeCode' },
]

export async function listMyQueries(organizationId, employeeId, query = {}) {
  const filter = { organization: organizationId, employee: employeeId }
  if (query.status) filter.status = query.status

  const queries = await EmployeeQuery.find(filter)
    .populate(QUERY_POPULATE)
    .sort({ createdAt: -1 })
    .lean()

  return queries.map(serializeQuery)
}

/** Manager/admin queue. The donor matched a non-existent `employee.manager` path. */
export async function listTeamQueries(organizationId, principal, query = {}) {
  const filter = { organization: organizationId }
  if (query.status) filter.status = query.status

  if (principal.role !== 'admin') {
    const team = await Employee.find({
      organization: organizationId,
      manager: principal.employeeId,
      'job.isActive': true,
    })
      .select('_id')
      .lean()
    filter.employee = { $in: team.map((member) => member._id) }
  }

  const queries = await EmployeeQuery.find(filter)
    .populate(QUERY_POPULATE)
    .sort({ createdAt: -1 })
    .lean()

  return queries.map(serializeQuery)
}

export async function raiseQuery({ organizationId, employeeId, body }) {
  const payload = validateQueryCreate(body)

  let task = null
  if (payload.task) {
    task = await Task.findOne({
      _id: payload.task,
      organization: organizationId,
      assignedTo: employeeId,
    }).lean()
    if (!task) throw ApiError.validation('Task not found or not assigned to you.')
  }

  const repeatsTask = Boolean(
    task &&
      (await EmployeeQuery.exists({
        organization: organizationId,
        employee: employeeId,
        task: task._id,
      })),
  )

  const query = await EmployeeQuery.create({
    organization: organizationId,
    employee: employeeId,
    task: task?._id ?? null,
    message: payload.message,
    status: initialQueryStatus(repeatsTask),
    attachments: payload.attachments,
  })

  await logActivity(organizationId, employeeId, 'query_raised', { queryId: query._id })
  return serializeQuery(query)
}

export async function reviewQuery({ organizationId, reviewer, queryId, body }) {
  const payload = validateQueryReview(body)

  const query = await EmployeeQuery.findOne({
    _id: queryId,
    organization: organizationId,
  }).populate('employee')
  if (!query) throw ApiError.notFound('Query not found.')

  const isTeam =
    reviewer.role === 'admin' ||
    (query.employee?.manager &&
      String(query.employee.manager) === String(reviewer.employeeId))
  if (!isTeam) throw ApiError.forbidden('You can only review queries from your team.')

  query.status = payload.status
  query.review = payload.review || query.review
  query.reviewedBy = reviewer.employeeId
  query.reviewedAt = new Date()
  await query.save()

  await logActivity(organizationId, query.employee._id, 'query_reviewed', {
    queryId: query._id,
    status: payload.status,
  })
  return serializeQuery(query)
}

/** Query statistics: self for employees, team for managers, org for admins. */
export async function queryStats({ organizationId, principal }) {
  let baseFilter = { organization: organizationId, employee: principal.employeeId }

  if (principal.role !== 'employee') {
    const team =
      principal.role === 'admin'
        ? await Employee.find({ organization: organizationId }).select('_id').lean()
        : await Employee.find({
            organization: organizationId,
            manager: principal.employeeId,
            'job.isActive': true,
          })
            .select('_id')
            .lean()
    baseFilter = {
      organization: organizationId,
      employee: { $in: team.map((member) => member._id) },
    }
  }

  const [total, open, inReview, resolved, raisedAgain] = await Promise.all([
    EmployeeQuery.countDocuments(baseFilter),
    EmployeeQuery.countDocuments({ ...baseFilter, status: 'open' }),
    EmployeeQuery.countDocuments({ ...baseFilter, status: 'in_review' }),
    EmployeeQuery.countDocuments({ ...baseFilter, status: 'resolved' }),
    EmployeeQuery.countDocuments({ ...baseFilter, status: 'raised_again' }),
  ])

  return { total, open, inReview, resolved, raisedAgain }
}

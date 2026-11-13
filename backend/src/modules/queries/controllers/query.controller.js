import { sendCreated, sendData } from '../../../lib/response.js'
import {
  listMyQueries,
  listTeamQueries,
  queryStats,
  raiseQuery,
  reviewQuery,
} from '../services/query.service.js'

export async function handleRaiseQuery(req, res) {
  const query = await raiseQuery({
    organizationId: req.principal.organizationId,
    employeeId: req.principal.employeeId,
    body: req.body ?? {},
  })
  return sendCreated(res, { query })
}

export async function handleMyQueries(req, res) {
  const queries = await listMyQueries(
    req.principal.organizationId,
    req.principal.employeeId,
    req.query,
  )
  return sendData(res, { queries })
}

export async function handleTeamQueries(req, res) {
  const queries = await listTeamQueries(
    req.principal.organizationId,
    req.principal,
    req.query,
  )
  return sendData(res, { queries })
}

export async function handleReviewQuery(req, res) {
  const query = await reviewQuery({
    organizationId: req.principal.organizationId,
    reviewer: req.principal,
    queryId: req.params.id,
    body: req.body ?? {},
  })
  return sendData(res, { query })
}

export async function handleQueryStats(req, res) {
  return sendData(
    res,
    await queryStats({
      organizationId: req.principal.organizationId,
      principal: req.principal,
    }),
  )
}

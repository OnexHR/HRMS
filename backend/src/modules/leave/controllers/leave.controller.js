import { sendCreated, sendData } from '../../../lib/response.js'
import {
  balanceView,
  cancelRequest,
  createLeaveRequest,
  listLeaveHistory,
  pendingForManager,
  reviewRequest,
  serializeLeaveRequest,
  updateDraft,
} from '../services/leave.service.js'

export async function handleBalance(req, res) {
  return sendData(res, { balance: balanceView(req.employee) })
}

export async function handleSubmitLeave(req, res) {
  const request = await createLeaveRequest({
    organizationId: req.principal.organizationId,
    employee: req.employee,
    body: req.body ?? {},
    saveAsDraft: false,
  })
  return sendCreated(res, { leaveRequest: serializeLeaveRequest(request) })
}

export async function handleSaveDraft(req, res) {
  const request = await createLeaveRequest({
    organizationId: req.principal.organizationId,
    employee: req.employee,
    body: req.body ?? {},
    saveAsDraft: true,
  })
  return sendCreated(res, { leaveRequest: serializeLeaveRequest(request) })
}

export async function handleUpdateDraft(req, res) {
  const request = await updateDraft({
    organizationId: req.principal.organizationId,
    employeeId: req.principal.employeeId,
    requestId: req.params.id,
    body: req.body ?? {},
  })
  return sendData(res, { leaveRequest: serializeLeaveRequest(request) })
}

export async function handleCancelLeave(req, res) {
  const request = await cancelRequest({
    organizationId: req.principal.organizationId,
    employeeId: req.principal.employeeId,
    requestId: req.params.id,
  })
  return sendData(res, { leaveRequest: serializeLeaveRequest(request) })
}

export async function handleHistory(req, res) {
  const leaveRequests = await listLeaveHistory({
    organizationId: req.principal.organizationId,
    employeeId: req.principal.employeeId,
    query: req.query,
  })
  return sendData(res, { leaveRequests })
}

export async function handlePendingForManager(req, res) {
  const requests = await pendingForManager({
    organizationId: req.principal.organizationId,
    principal: req.principal,
  })
  return sendData(res, {
    leaveRequests: requests.map(serializeLeaveRequest),
  })
}

export async function handleReviewLeave(req, res) {
  const request = await reviewRequest({
    organizationId: req.principal.organizationId,
    reviewer: req.principal,
    requestId: req.params.id,
    body: req.body ?? {},
  })
  return sendData(res, { leaveRequest: serializeLeaveRequest(request) })
}

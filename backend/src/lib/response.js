/**
 * Response helpers implementing the locked transport contract:
 * `{ success, data, error }` and `{ items, meta }` for paginated payloads.
 */

export function sendData(res, data, status = 200) {
  return res.status(status).json({ success: true, data })
}

export function sendCreated(res, data) {
  return sendData(res, data, 201)
}

export function sendPaginated(res, items, meta, status = 200) {
  return res.status(status).json({ success: true, data: { items, meta } })
}

export function paginationMeta(page, pageSize, total) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeSize = Math.max(1, Number(pageSize) || 20)
  return {
    page: safePage,
    pageSize: safeSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / safeSize),
  }
}

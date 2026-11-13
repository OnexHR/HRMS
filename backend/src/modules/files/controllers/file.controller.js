import { ApiError } from '../../../lib/api-error.js'
import { sendCreated, sendData } from '../../../lib/response.js'
import { deleteFile, loadAccessibleFile, openDownload, saveUpload } from '../services/file.service.js'

export async function handleUploadFile(req, res) {
  const result = await saveUpload({
    organizationId: req.principal.organizationId,
    uploadedBy: req.principal.employeeId,
    scope: req.body?.scope,
    file: req.file,
  })
  return sendCreated(res, result)
}

function contentDisposition(name, mimeType) {
  const ascii = String(name).replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(name)
  const inline = mimeType.startsWith('image/') || mimeType === 'application/pdf'
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

export async function handleDownloadFile(req, res) {
  const asset = await loadAccessibleFile({
    organizationId: req.principal.organizationId,
    principal: req.principal,
    fileId: req.params.id,
  })

  res.setHeader('Content-Type', asset.mimeType)
  res.setHeader('Content-Length', String(asset.size))
  res.setHeader('Content-Disposition', contentDisposition(asset.originalName, asset.mimeType))
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  const stream = openDownload(asset)
  stream.on('error', (error) => {
    if (!res.headersSent) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found.' },
      })
      return
    }
    res.destroy(error)
  })
  stream.pipe(res)
}

export async function handleDeleteFile(req, res) {
  if (!req.params.id) throw ApiError.validation('A file id is required.')
  const result = await deleteFile({
    organizationId: req.principal.organizationId,
    principal: req.principal,
    fileId: req.params.id,
  })
  return sendData(res, result)
}

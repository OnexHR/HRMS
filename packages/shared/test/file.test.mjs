import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildFileResourceUrl,
  createFileUploadMetadataSchema,
  fileExtensionOf,
  isAllowedMimeType,
  isFilenameConsistentWithMime,
  isWithinUploadSize,
  normalizeFilename,
  normalizeMimeType,
} from '../dist/index.js'

test('M5: MIME types are lowercased, parameter-stripped, and aliased', () => {
  assert.equal(normalizeMimeType(' IMAGE/PNG '), 'image/png')
  assert.equal(normalizeMimeType('text/plain; charset=utf-8'), 'text/plain')
  assert.equal(normalizeMimeType('image/jpg'), 'image/jpeg')
  assert.equal(normalizeMimeType('image/pjpeg'), 'image/jpeg')
})

test('allowlist checks normalize before comparing', () => {
  assert.equal(isAllowedMimeType('IMAGE/PNG'), true)
  assert.equal(isAllowedMimeType('text/plain; charset=utf-8'), true)
  assert.equal(isAllowedMimeType('image/jpg'), true)
  assert.equal(isAllowedMimeType('application/x-msdownload'), false)
})

test('filenames are sanitized against traversal and control characters', () => {
  assert.equal(normalizeFilename('../../etc/passwd'), 'passwd')
  assert.equal(normalizeFilename('C:\\Users\\evil\\report.pdf'), 'report.pdf')
  assert.equal(normalizeFilename('bad\u0000name.pdf'), 'badname.pdf')
  assert.equal(normalizeFilename(' . '), 'file')
  assert.equal(normalizeFilename('report.pdf.'), 'report.pdf')

  const long = normalizeFilename('x'.repeat(300) + '.pdf')
  assert.ok(long.length <= 255)
  assert.ok(long.endsWith('.pdf'))
})

test('extension helpers are case-insensitive and MIME-aware', () => {
  assert.equal(fileExtensionOf('Photo.PNG'), '.png')
  assert.equal(fileExtensionOf('no-extension'), '')
  assert.equal(isFilenameConsistentWithMime('photo.PNG', 'image/png'), true)
  assert.equal(isFilenameConsistentWithMime('photo.jpeg', 'image/jpeg'), true)
  assert.equal(isFilenameConsistentWithMime('photo.jpg', 'image/jpeg'), true)
  assert.equal(isFilenameConsistentWithMime('photo.pdf', 'image/jpeg'), false)
})

test('upload schema enforces the supplied allowlist, size, and extension', () => {
  const schema = createFileUploadMetadataSchema({
    maxSizeBytes: 1024,
    allowedMimeTypes: ['image/png', 'application/pdf'],
  })

  const parsed = schema.parse({
    filename: '..\\Photo.PNG',
    mimeType: 'IMAGE/PNG; charset=binary',
    size: 1024,
    scope: 'avatar',
  })

  assert.equal(parsed.filename, 'Photo.PNG')
  assert.equal(parsed.mimeType, 'image/png')
  assert.equal(parsed.size, 1024)
  assert.equal(parsed.scope, 'avatar')
  assert.equal('refId' in parsed, false)

  assert.equal(
    schema.safeParse({ filename: 'photo.png', mimeType: 'image/png', size: 10 }).success,
    true,
  )
  assert.equal(
    schema.safeParse({ filename: 'photo.png', mimeType: 'image/png', size: 1025 }).success,
    false,
  )
  assert.equal(
    schema.safeParse({ filename: 'photo.png', mimeType: 'image/png', size: 0 }).success,
    false,
  )
  assert.equal(
    schema.safeParse({ filename: 'photo.gif', mimeType: 'image/gif', size: 10 }).success,
    false,
  )
  assert.equal(
    schema.safeParse({ filename: 'photo.exe', mimeType: 'image/png', size: 10 }).success,
    false,
  )
})

test('upload size helper and resource URL are policy-safe', () => {
  assert.equal(isWithinUploadSize(0, 10), false)
  assert.equal(isWithinUploadSize(10 * 1024 * 1024, 10), true)
  assert.equal(isWithinUploadSize(10 * 1024 * 1024 + 1, 10), false)
  assert.equal(buildFileResourceUrl('abc123'), '/api/v1/files/abc123')
})

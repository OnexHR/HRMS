/**
 * Small text helpers that must work identically in Node and the browser.
 */

/**
 * UTF-8 byte length of a string, without `TextEncoder` or Node built-ins.
 *
 * bcrypt truncates at 72 bytes, so validation must measure bytes rather than
 * UTF-16 code units. Lone surrogates are counted as three bytes, matching the
 * replacement character that UTF-8 encoders emit.
 */
export function utf8ByteLength(value: string): number {
  let bytes = 0
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code <= 0x7f) bytes += 1
    else if (code <= 0x7ff) bytes += 2
    else if (code <= 0xffff) bytes += 3
    else bytes += 4
  }
  return bytes
}

/**
 * Truncates a string to at most `maxBytes` UTF-8 bytes without splitting a
 * code point.
 *
 * Existing donor hashes were produced by bcryptjs, which consumes only the
 * first 72 bytes of a password. Node's bcrypt 6 reproduces the legacy
 * wrap-around path for `$2a$` hashes when handed a longer string, so legacy
 * passwords must be truncated explicitly before comparison. New passwords are
 * validated to fit within the limit, making this a no-op for them.
 */
export function truncateUtf8(value: string, maxBytes: number): string {
  if (maxBytes <= 0) return ''

  const characters: string[] = []
  let bytes = 0
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    const size = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4
    if (bytes + size > maxBytes) break
    characters.push(character)
    bytes += size
  }
  return characters.join('')
}

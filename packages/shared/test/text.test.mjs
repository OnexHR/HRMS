import test from 'node:test'
import assert from 'node:assert/strict'

import { truncateUtf8, utf8ByteLength } from '../dist/index.js'

test('utf8ByteLength counts UTF-8 bytes, not UTF-16 code units', () => {
  assert.equal(utf8ByteLength(''), 0)
  assert.equal(utf8ByteLength('abc'), 3)
  assert.equal(utf8ByteLength('é'), 2)
  assert.equal(utf8ByteLength('€'), 3)
  assert.equal(utf8ByteLength('😀'), 4)
  assert.equal(utf8ByteLength('aé€😀'), 10)
  assert.equal(utf8ByteLength('\uD800'), 3) // lone surrogate -> replacement char
})

test('truncateUtf8 respects the byte budget without splitting code points', () => {
  assert.equal(truncateUtf8('', 72), '')
  assert.equal(truncateUtf8('abc', 0), '')
  assert.equal(truncateUtf8('abc', 2), 'ab')
  assert.equal(truncateUtf8('abc', 10), 'abc')
  assert.equal(truncateUtf8('😀', 3), '')
  assert.equal(truncateUtf8('😀', 4), '😀')

  const ascii = 'Aa1!' + 'x'.repeat(96)
  const asciiTruncated = truncateUtf8(ascii, 72)
  assert.equal(asciiTruncated.length, 72)
  assert.equal(utf8ByteLength(asciiTruncated), 72)

  // 5-byte prefix + 2 bytes per `é`: 33 characters fit (71 bytes); the next
  // character would take the total to 73, so it must not be partially emitted.
  const multibyte = 'Aa1!x' + 'é'.repeat(40)
  const multibyteTruncated = truncateUtf8(multibyte, 72)
  assert.equal(multibyteTruncated, 'Aa1!x' + 'é'.repeat(33))
  assert.equal(utf8ByteLength(multibyteTruncated), 71)

  const emoji = '😀'.repeat(20)
  const emojiTruncated = truncateUtf8(emoji, 72)
  assert.equal(emojiTruncated, '😀'.repeat(18)) // 18 * 4 = 72
  assert.equal(utf8ByteLength(emojiTruncated), 72)
})

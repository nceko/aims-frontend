import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const httpClient = await readFile(new URL('../src/services/http.ts', import.meta.url), 'utf8')
const deviceUtility = await readFile(
  new URL('../src/utils/device-name.ts', import.meta.url),
  'utf8',
)

test('login sends a safe X-Device-Name header', () => {
  assert.match(httpClient, /path === requestPath\(endpoints\.auth\.login\)/)
  assert.match(httpClient, /headers\.set\('X-Device-Name', deviceName\(\)\)/)
  assert.match(deviceUtility, /\.slice\(0, 120\)/)
  assert.match(deviceUtility, /Desktop/)
  assert.match(deviceUtility, /Mobile/)
  assert.match(deviceUtility, /Tablet/)
})

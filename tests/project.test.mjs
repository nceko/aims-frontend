import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const endpoints = await readFile(new URL('../src/config/endpoints.ts', import.meta.url), 'utf8')

test('npm is pinned to 11.6.0', () => {
  assert.equal(packageJson.packageManager, 'npm@11.6.0')
  assert.equal(packageJson.engines.npm, '11.6.0')
})

test('AIMS authentication endpoints are configured', () => {
  assert.match(endpoints, /\/public\/v1\/companies/)
  assert.match(endpoints, /\/api\/v1\/auth\/login/)
  assert.match(endpoints, /\/api\/v1\/auth\/switch-context/)
})

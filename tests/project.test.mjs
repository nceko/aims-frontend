import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const endpoints = await readFile(new URL('../src/config/endpoints.ts', import.meta.url), 'utf8')
const modules = await readFile(new URL('../src/config/modules.ts', import.meta.url), 'utf8')
const navigation = await readFile(new URL('../src/config/navigation.ts', import.meta.url), 'utf8')
const generatedPermissions = await readFile(
  new URL('../src/generated/permissions.ts', import.meta.url),
  'utf8',
)
const metadata = JSON.parse(
  await readFile(new URL('../src/generated/api-metadata.json', import.meta.url), 'utf8'),
)
const lockfile = await readFile(new URL('../package-lock.json', import.meta.url), 'utf8')

const loginView = await readFile(
  new URL('../src/modules/auth/LoginView.vue', import.meta.url),
  'utf8',
)
const appInput = await readFile(
  new URL('../src/components/ui/AppInput.vue', import.meta.url),
  'utf8',
)
const appSelect = await readFile(
  new URL('../src/components/ui/AppSelect.vue', import.meta.url),
  'utf8',
)
const apiOptionField = await readFile(
  new URL('../src/components/data/ApiOptionField.vue', import.meta.url),
  'utf8',
)
const resourceWorkbench = await readFile(
  new URL('../src/modules/resource/ResourceWorkbenchView.vue', import.meta.url),
  'utf8',
)
const authApi = await readFile(new URL('../src/modules/auth/auth.api.ts', import.meta.url), 'utf8')
const authTypes = await readFile(new URL('../src/types/auth.ts', import.meta.url), 'utf8')

function quotedValues(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1]).filter(Boolean)
}

test('npm is pinned to 11.6.0', () => {
  assert.equal(packageJson.packageManager, 'npm@11.6.0')
  assert.equal(packageJson.engines.npm, '11.6.0')
})

test('package lock uses the public npm registry', () => {
  assert.doesNotMatch(lockfile, /applied-caas|internal\.api\.openai\.org/)
  assert.match(lockfile, /https:\/\/registry\.npmjs\.org\//)
})

test('AIMS authentication endpoints are configured', () => {
  assert.match(endpoints, /\/public\/v1\/companies/)
  assert.match(endpoints, /\/api\/v1\/auth\/login/)
  assert.match(endpoints, /\/api\/v1\/auth\/switch-context/)
})

test('all configured module operations exist in BACKEND(66) Swagger metadata', () => {
  const references = new Set(
    quotedValues(
      modules,
      /(?:listOperationId|detailOperationId|createOperationId|updateOperationId|deleteOperationId|operationId):\s*'([^']+)'/g,
    ),
  )
  const available = new Set(Object.keys(metadata.operations))
  const missing = [...references].filter((operationId) => !available.has(operationId))
  assert.deepEqual(missing, [])
  assert.ok(
    references.size >= 240,
    `expected broad operation coverage, received ${references.size}`,
  )
})

test('frontend permission references use exported backend permission codes', () => {
  const available = new Set(quotedValues(generatedPermissions, /code:\s*'([^']+)'/g))
  const source = `${modules}\n${navigation}`
  const references = new Set(
    quotedValues(
      source,
      /'((?:auth|catalog|dashboard|inventory|maintenance|operations|organization|reports|transaction|warehouse|warehouses)\.[a-zA-Z0-9_.]+)'/g,
    ),
  )
  const missing = [...references].filter((permission) => !available.has(permission))
  assert.deepEqual(missing, [])
  assert.ok(available.size >= 180)
})

test('legacy prototype permission prefixes are not used by current module configuration', () => {
  assert.doesNotMatch(modules, /'master\./)
  assert.doesNotMatch(modules, /'iam\./)
})

test('login form supports browser autofill without a stale disabled button', () => {
  assert.match(loginView, /new FormData\(formElement\)/)
  assert.match(loginView, /name="company_id"/)
  assert.match(loginView, /name="identity"/)
  assert.match(loginView, /name="password"/)
  assert.doesNotMatch(
    loginView,
    /:disabled="!form\.companyId \|\| !form\.(?:email|identity) \|\| !form\.password"/,
  )
  assert.match(appInput, /@change="syncValue"/)
  assert.match(appSelect, /class="select2-native-control"/)
  assert.match(appSelect, /@change=/)
  assert.match(appSelect, /emitValue/)
})

test('all application dropdowns use the AIMS Select2 component', () => {
  assert.match(appSelect, /select2-search__field/)
  assert.match(appSelect, /select2-results__option/)
  assert.match(apiOptionField, /<AppSelect/)
  assert.match(resourceWorkbench, /<AppSelect/)
  assert.doesNotMatch(apiOptionField, /<select/)
  assert.doesNotMatch(resourceWorkbench, /<select/)
})

test('login contract matches BACKEND(66) company and identity fields', () => {
  assert.match(authTypes, /id_company\?: number/)
  assert.match(authApi, /company\.id_company \?\? company\.company_id \?\? company\.id/)
  assert.match(authApi, /identity: string/)
  assert.doesNotMatch(authApi, /login: \(body: \{ company_id: number; email: string/)
  assert.match(loginView, /formData\.get\('identity'\)/)
  assert.match(loginView, /identity: form\.identity/)
})

test('login reads currentTarget before any asynchronous boundary', () => {
  const submitStart = loginView.indexOf('async function submitCredentials')
  const submitEnd = loginView.indexOf('async function submitContext')
  const submitSource = loginView.slice(submitStart, submitEnd)
  assert.match(submitSource, /const formElement = event\.currentTarget/)
  assert.doesNotMatch(submitSource, /await nextTick\(\)/)
})

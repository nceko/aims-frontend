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
const dataTableSourceForSelect2 = await readFile(
  new URL('../src/components/data/AppDataTable.vue', import.meta.url),
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
  assert.match(dataTableSourceForSelect2, /<AppSelect/)
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

const appTopbar = await readFile(
  new URL('../src/components/layout/AppTopbar.vue', import.meta.url),
  'utf8',
)
const contextSwitcher = await readFile(
  new URL('../src/components/layout/ContextSwitcherModal.vue', import.meta.url),
  'utf8',
)
const profileView = await readFile(
  new URL('../src/modules/profile/ProfileView.vue', import.meta.url),
  'utf8',
)
const authStore = await readFile(
  new URL('../src/modules/auth/auth.store.ts', import.meta.url),
  'utf8',
)
const uiStore = await readFile(new URL('../src/stores/ui.store.ts', import.meta.url), 'utf8')
const mainStyles = await readFile(
  new URL('../src/assets/styles/main.scss', import.meta.url),
  'utf8',
)

test('topbar provides persisted light and dark theme controls', () => {
  assert.match(appTopbar, /ui\.toggleTheme/)
  assert.match(appTopbar, /ui\.theme === 'dark'/)
  assert.match(uiStore, /aims\.theme/)
  assert.match(uiStore, /document\.documentElement\.dataset\.theme/)
  assert.match(mainStyles, /html\[data-theme='dark'\]/)
})

test('topbar provides context switching with Select2 fields', () => {
  assert.match(appTopbar, /ContextSwitcherModal/)
  assert.match(appTopbar, /Ganti Context/)
  assert.match(contextSwitcher, /<AppSelect/)
  assert.match(contextSwitcher, /auth\.switchContext/)
  assert.doesNotMatch(contextSwitcher, /context_company_id/)
  assert.match(contextSwitcher, /context_location_id/)
  assert.match(contextSwitcher, /context_category_group_id/)
})

test('profile is sanitized and does not render tokens or raw user objects', () => {
  assert.doesNotMatch(profileView, /StructuredData/)
  assert.doesNotMatch(profileView, /access_token|refresh_token|token_type|expires_in/)
  assert.doesNotMatch(profileView, /:value="auth\.user"/)
  assert.match(authStore, /function safeProfile/)
  assert.doesNotMatch(authStore, /user\.value = \{\s*\.\.\.response/s)
  assert.match(authStore, /current_refresh_token/)
})

const dataTable = await readFile(
  new URL('../src/components/data/AppDataTable.vue', import.meta.url),
  'utf8',
)
const appLayout = await readFile(new URL('../src/layouts/AppLayout.vue', import.meta.url), 'utf8')
const horizontalNav = await readFile(
  new URL('../src/components/layout/AppHorizontalNav.vue', import.meta.url),
  'utf8',
)
const changePasswordModal = await readFile(
  new URL('../src/components/layout/ChangePasswordModal.vue', import.meta.url),
  'utf8',
)

// Regression coverage for the AIMS table and per-user navigation preferences.
test('resource and report tables use the reusable AIMS DataTable', () => {
  assert.match(dataTable, /datatable__search/)
  assert.match(dataTable, /toggleSort/)
  assert.match(dataTable, /visibleColumnKeys/)
  assert.match(dataTable, /page-change/)
  assert.match(resourceWorkbench, /<AppDataTable/)
})

test('menu layout can be selected per user and rendered below the topbar', () => {
  assert.match(uiStore, /aims\.menu-layout/)
  assert.match(uiStore, /bindUserPreferences/)
  assert.match(uiStore, /setMenuLayout/)
  assert.match(appLayout, /AppHorizontalNav/)
  assert.match(horizontalNav, /horizontal-nav__dropdown/)
  assert.match(profileView, /Menu Sidebar/)
  assert.match(profileView, /Menu di Bawah Topbar/)
})

test('context switching never changes company during an active session', () => {
  assert.doesNotMatch(contextSwitcher, /context_company_id/)
  assert.doesNotMatch(contextSwitcher, /companyChanged/)
  assert.match(contextSwitcher, /Company dikunci selama session aktif/)
  assert.match(contextSwitcher, /location_id/)
  assert.match(contextSwitcher, /category_group_id/)
})

test('users can change their own password and are logged out afterwards', () => {
  assert.match(changePasswordModal, /Password Baru/)
  assert.match(changePasswordModal, /Konfirmasi Password Baru/)
  assert.match(changePasswordModal, /auth\.changeOwnPassword/)
  assert.match(authApi, /\/api\/v1\/users\/\$\{encodeURIComponent\(userId\)\}\/password/)
  assert.match(authStore, /changeOwnPassword/)
  assert.match(appTopbar, /Ganti Password/)
})

const appSidebar = await readFile(
  new URL('../src/components/layout/AppSidebar.vue', import.meta.url),
  'utf8',
)

test('AIMS logo remains available for sidebar and horizontal menu layouts', () => {
  assert.match(appSidebar, /<AppLogo inverse \/>/)
  assert.match(appTopbar, /<AppLogo class="app-topbar__brand" \/>/)
  assert.match(
    mainStyles,
    /app-shell:not\(\.app-shell--horizontal\):not\(\.app-shell--sidebar-hidden\)/,
  )
})

test('hamburger toggles menu visibility without changing the selected layout', () => {
  assert.match(appTopbar, /ui\.toggleNavigation/)
  assert.match(appTopbar, /aria-controls="aims-primary-navigation"/)
  assert.match(uiStore, /function toggleNavigation\(\)/)
  assert.match(uiStore, /setHorizontalMenuOpen\(!horizontalMenuOpen\.value\)/)
  assert.match(uiStore, /setSidebarOpen\(!sidebarOpen\.value\)/)
  assert.doesNotMatch(
    uiStore,
    /if \(menuLayout\.value === 'horizontal'\) \{\s*setMenuLayout\('sidebar'\)/s,
  )
  assert.match(appLayout, /ui\.menuLayout === 'horizontal' && ui\.horizontalMenuOpen/)
})

test('horizontal child menus are not clipped by the navigation container', () => {
  assert.match(mainStyles, /\.horizontal-nav__inner\s*\{[^}]*flex-wrap:\s*wrap/s)
  assert.match(mainStyles, /\.horizontal-nav__inner\s*\{[^}]*overflow:\s*visible/s)
  assert.match(mainStyles, /\.horizontal-nav__dropdown\s*\{[^}]*z-index:\s*120/s)
})

test('footer is permanently visible and contains version and copyright metadata', () => {
  assert.match(appLayout, /currentYear/)
  assert.match(appLayout, /packageInfo\.version/)
  assert.match(appLayout, /Seluruh hak cipta dilindungi/)
  assert.match(appLayout, /Versi \{\{ appVersion \}\}/)
  assert.match(mainStyles, /\.app-shell__workspace\s*\{[^}]*height:\s*100dvh/s)
  assert.match(mainStyles, /\.app-footer\s*\{[^}]*flex:\s*0 0 var\(--app-footer-height\)/s)
})

test('datatable opens with every column enabled and owns its scrolling area', () => {
  assert.match(dataTable, /columnSignature/)
  assert.match(
    dataTable,
    /visibleColumnKeys\.value = new Set\(props\.columns\.map\(\(column\) => column\.key\)\)/,
  )
  assert.match(mainStyles, /\.resource-table-card \.table-responsive\s*\{[^}]*flex:\s*1 1 auto/s)
  assert.match(mainStyles, /\.table-responsive\s*\{[^}]*overflow:\s*auto/s)
  assert.match(mainStyles, /\.data-table th\s*\{[^}]*position:\s*sticky/s)
  assert.match(resourceWorkbench, /page-stack page-stack--resource/)
  assert.match(resourceWorkbench, /class="resource-table-card"/)
})

const httpClient = await readFile(new URL('../src/services/http.ts', import.meta.url), 'utf8')
const requestPolicy = await readFile(
  new URL('../src/services/request-policy.ts', import.meta.url),
  'utf8',
)
const apiClientSource = await readFile(
  new URL('../src/services/api-client.ts', import.meta.url),
  'utf8',
)
const attachmentsSource = await readFile(
  new URL('../src/components/data/DocumentAttachments.vue', import.meta.url),
  'utf8',
)
const reportsSource = await readFile(
  new URL('../src/modules/reports/ReportsView.vue', import.meta.url),
  'utf8',
)

// Regression coverage for protected API headers and one-line table actions.
test('protected API requests always use bearer authorization and safe content headers', () => {
  assert.match(httpClient, /headers\.set\('Authorization', `Bearer \$\{token\}`\)/)
  assert.match(httpClient, /requiresBearerToken\(path\)/)
  assert.match(httpClient, /AUTH_TOKEN_MISSING/)
  assert.match(httpClient, /headers\.set\('Content-Type', 'application\/json'\)/)
  assert.match(httpClient, /headers\.delete\('Content-Type'\)/)
  assert.match(requestPolicy, /AUTH_WITHOUT_BEARER/)
  assert.match(requestPolicy, /\/api\/v1\/auth\/login/)
  assert.match(requestPolicy, /\/api\/v1\/auth\/refresh/)
})

test('idempotency header is opt-in because current backend CORS does not allow it', async () => {
  const runtimeConfig = await readFile(new URL('../src/config/runtime.ts', import.meta.url), 'utf8')
  const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
  assert.match(httpClient, /runtimeConfig\.enableIdempotencyHeader/)
  assert.match(httpClient, /Idempotency-Key/)
  assert.match(requestPolicy, /needsIdempotencyKey/)
  assert.match(runtimeConfig, /enableIdempotencyHeader/)
  assert.match(envExample, /VITE_ENABLE_IDEMPOTENCY_HEADER=false/)
})

test('all uploads downloads and raw documents use the centralized API client', () => {
  assert.match(apiClientSource, /postForm/)
  assert.match(apiClientSource, /download\(/)
  assert.match(apiClientSource, /getRaw/)
  assert.match(attachmentsSource, /apiClient\.postForm/)
  assert.match(attachmentsSource, /apiClient\.download/)
  assert.match(reportsSource, /apiClient\.download/)
  assert.doesNotMatch(attachmentsSource, /services\/http/)
  assert.doesNotMatch(reportsSource, /services\/http/)
})

test('datatable action buttons stay horizontal in a fixed right-side column', () => {
  assert.match(mainStyles, /\.row-actions\s*\{[^}]*flex-wrap:\s*nowrap/s)
  assert.match(mainStyles, /\.row-actions\s*\{[^}]*white-space:\s*nowrap/s)
  assert.match(mainStyles, /td\.table-actions-column\s*\{[^}]*position:\s*sticky/s)
  assert.match(mainStyles, /table-actions-column\s*\{[^}]*min-width:\s*176px/s)
})

test('context options use endpoint-specific query parameters and cached login access', () => {
  assert.match(
    authApi,
    /const locationParams = companyId \? \{ company_id: companyId, limit: 100 \}/,
  )
  assert.match(
    authApi,
    /const categoryGroupParams = companyId \? \{ company_id: companyId \} : undefined/,
  )
  assert.doesNotMatch(authApi, /category-groups\/options', params/)
  assert.match(contextSwitcher, /hasCachedOptions/)
  assert.match(contextSwitcher, /if \(!hasCachedOptions\)/)
})

test('dashboard no longer fetches or renders Audit & API Activity', async () => {
  const dashboardView = await readFile(
    new URL('../src/modules/dashboard/DashboardView.vue', import.meta.url),
    'utf8',
  )
  const dashboardApi = await readFile(
    new URL('../src/modules/dashboard/dashboard.api.ts', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(dashboardView, /Audit & API Activity/)
  assert.doesNotMatch(dashboardView, /dashboardApi\.audit/)
  assert.doesNotMatch(dashboardApi, /audit:/)
})

test('workflow action popover is teleported above the scrollable table', () => {
  assert.match(resourceWorkbench, /<Teleport to="body">/)
  assert.match(resourceWorkbench, /action-menu__popover--portal/)
  assert.match(resourceWorkbench, /toggleRowMenu/)
  assert.match(resourceWorkbench, /positionRowMenu/)
  assert.match(mainStyles, /\.action-menu__popover--portal\s*\{[^}]*position:\s*fixed/s)
  assert.match(mainStyles, /\.action-menu__popover--portal\s*\{[^}]*z-index:\s*5000/s)
})

const goodsReceiptQrModal = await readFile(
  new URL('../src/components/data/GoodsReceiptQrModal.vue', import.meta.url),
  'utf8',
)

test('goods receipt QR generation opens a printable preview and supports PDF output', () => {
  assert.match(modules, /handler: 'generate-qr-labels'/)
  assert.match(modules, /handler: 'qr-labels'/)
  assert.match(resourceWorkbench, /openGoodsReceiptQrLabels/)
  assert.match(resourceWorkbench, /generated_qr_codes/)
  assert.match(resourceWorkbench, /<GoodsReceiptQrModal/)
  assert.match(goodsReceiptQrModal, /QRCode\.toDataURL/)
  assert.match(goodsReceiptQrModal, /import\('jspdf'\)/)
  assert.match(goodsReceiptQrModal, /Download PDF/)
  assert.match(goodsReceiptQrModal, /Label printer 50 × 30 mm/)
  assert.match(goodsReceiptQrModal, /Lembar A4 \(3 kolom\)/)
})

test('resource notices auto-dismiss and are cleared when switching modules', () => {
  assert.match(resourceWorkbench, /successNoticeTimer = window\.setTimeout/)
  assert.match(resourceWorkbench, /}, 5000\)/)
  assert.match(resourceWorkbench, /errorNoticeTimer = window\.setTimeout/)
  assert.match(resourceWorkbench, /}, 8000\)/)
  assert.match(resourceWorkbench, /clearNotices\(\)/)
  assert.match(resourceWorkbench, /\(\) => props\.moduleKey/)
  assert.match(resourceWorkbench, /notice--dismissible/)
})

test('navigation active state follows the current route instead of inclusive root matching', () => {
  assert.match(appSidebar, /if \(to === '\/'\) return route\.path === '\/'/)
  assert.match(appSidebar, /'is-active': isRouteActive\(item\.to\)/)
  assert.match(appSidebar, /'nav-group--active': groupActive\(item\)/)
  assert.match(appSidebar, /'is-active': isRouteActive\(child\.to\)/)
  assert.match(horizontalNav, /if \(to === '\/'\) return route\.path === '\/'/)
  assert.match(mainStyles, /\.nav-link\.is-active/)
  assert.doesNotMatch(mainStyles, /\.nav-link\.router-link-active/)
})

const appModalSource = await readFile(
  new URL('../src/components/ui/AppModal.vue', import.meta.url),
  'utf8',
)
const confirmDialogSource = await readFile(
  new URL('../src/components/ui/AppConfirmDialog.vue', import.meta.url),
  'utf8',
)
const relatedDataTableSource = await readFile(
  new URL('../src/components/data/RelatedDataTable.vue', import.meta.url),
  'utf8',
)
const structuredDataSource = await readFile(
  new URL('../src/components/data/StructuredData.vue', import.meta.url),
  'utf8',
)
const detailDisplaySource = await readFile(
  new URL('../src/utils/detail-display.ts', import.meta.url),
  'utf8',
)

test('login identity accepts either email or NIB without native email validation', () => {
  assert.match(loginView, /label="Email \/ NIB"[\s\S]*?type="text"/)
  assert.match(loginView, /name="identity"/)
  assert.doesNotMatch(loginView, /label="Email \/ NIB" type="email"/)
})

test('soft delete uses an AIMS confirmation modal instead of browser confirm', () => {
  assert.match(resourceWorkbench, /<AppConfirmDialog/)
  assert.match(resourceWorkbench, /Konfirmasi soft delete/)
  assert.match(resourceWorkbench, /confirmDelete/)
  assert.match(attachmentsSource, /<AppConfirmDialog/)
  assert.doesNotMatch(resourceWorkbench, /window\.confirm/)
  assert.doesNotMatch(attachmentsSource, /window\.confirm/)
  assert.match(confirmDialogSource, /confirm-dialog/)
})

test('nested modals use explicit layers so child actions appear above detail', () => {
  assert.match(appModalSource, /layer\?: number/)
  assert.match(appModalSource, /90 \+ Math\.max\(0, layer - 1\) \* 20/)
  assert.match(resourceWorkbench, /:layer="showDetail \? 2 : 1"/)
  assert.match(resourceWorkbench, /:layer="1"/)
  assert.match(resourceWorkbench, /:layer="3"/)
})

test('all related detail collections use a compact searchable paginated table', () => {
  assert.match(resourceWorkbench, /<RelatedDataTable/)
  assert.match(structuredDataSource, /<RelatedDataTable/)
  assert.match(relatedDataTableSource, /type="search"/)
  assert.match(relatedDataTableSource, /pageCount/)
  assert.match(relatedDataTableSource, /related-data-table__table/)
  assert.match(mainStyles, /\.related-data-table__table-wrap\s*\{[^}]*max-height:/s)
  assert.match(mainStyles, /\.related-data-table__table-wrap\s*\{[^}]*overflow:\s*auto/s)
})

test('technical IDs stay available internally but are hidden from user-facing detail views', () => {
  assert.match(detailDisplaySource, /isTechnicalIdField/)
  assert.match(detailDisplaySource, /normalized\.endsWith\('_id'\)/)
  assert.match(detailDisplaySource, /normalized\.startsWith\('id_'\)/)
  assert.match(structuredDataSource, /shouldHideDetailField/)
  assert.match(resourceWorkbench, /isTechnicalIdField\(column\)/)
  assert.match(resourceWorkbench, /rowId\(row/)
  assert.match(detailDisplaySource, /detailFieldLabel/)
  assert.match(detailDisplaySource, /'_name'/)
})

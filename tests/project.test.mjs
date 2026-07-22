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
const resourceIdUtils = await readFile(
  new URL('../src/utils/resource-id.ts', import.meta.url),
  'utf8',
)
const appSidebar = await readFile(
  new URL('../src/components/layout/AppSidebar.vue', import.meta.url),
  'utf8',
)
const appHorizontalNav = await readFile(
  new URL('../src/components/layout/AppHorizontalNav.vue', import.meta.url),
  'utf8',
)

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

test('sensitive workflow actions use granular phase 4 permissions', () => {
  const expected = [
    ['ApprovePurchaseOrder', 'transaction.purchase_orders.approve'],
    ['CheckGoodsReceipt', 'transaction.goods_receipts.check'],
    ['SubmitItemRequest', 'transaction.item_requests.submit'],
    ['PostItemUsage', 'transaction.item_usages.post'],
    ['PostStockAdjustment', 'inventory.stock_adjustments.post'],
    ['PostStockOpname', 'inventory.stock_opnames.post'],
    ['ReverseDeliveryOrder', 'transaction.delivery_orders.reverse'],
  ]

  for (const [operationId, permission] of expected) {
    const actionPattern = new RegExp(
      `operationId:\\s*'${operationId}'[\\s\\S]{0,220}?permission:\\s*'${permission.replaceAll('.', '\\.')}'`,
    )
    assert.match(modules, actionPattern)
  }
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
  assert.match(appTopbar, /Ganti Konteks/)
  assert.match(contextSwitcher, /<AppSelect/)
  assert.match(contextSwitcher, /auth\.switchContext/)
  assert.match(contextSwitcher, /context_company_id/)
  assert.match(contextSwitcher, /v-if="auth\.isSuperAdmin"/)
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

test('context switching allows only super admins to change company', () => {
  assert.match(contextSwitcher, /context_company_id/)
  assert.match(contextSwitcher, /v-if="auth\.isSuperAdmin"/)
  assert.match(contextSwitcher, /company_id: auth\.isSuperAdmin/)
  assert.match(contextSwitcher, /v-else class="context-company-lock"/)
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

test('idempotency header is enabled because the backend CORS allows it', async () => {
  const runtimeConfig = await readFile(new URL('../src/config/runtime.ts', import.meta.url), 'utf8')
  const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
  assert.match(httpClient, /runtimeConfig\.enableIdempotencyHeader/)
  assert.match(httpClient, /Idempotency-Key/)
  assert.match(requestPolicy, /needsIdempotencyKey/)
  assert.match(runtimeConfig, /enableIdempotencyHeader/)
  assert.match(envExample, /VITE_ENABLE_IDEMPOTENCY_HEADER=true/)
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

test('all options endpoints are requested without limit or pagination parameters', async () => {
  const optionField = await readFile(
    new URL('../src/components/data/ApiOptionField.vue', import.meta.url),
    'utf8',
  )
  const queryPolicy = await readFile(
    new URL('../src/services/query-policy.ts', import.meta.url),
    'utf8',
  )

  assert.match(
    authApi,
    /const locationParams = companyId \? \{ company_id: companyId \} : undefined/,
  )
  assert.match(
    authApi,
    /const categoryGroupParams = companyId \? \{ company_id: companyId \} : undefined/,
  )
  assert.doesNotMatch(authApi, /limit\s*:/)
  assert.doesNotMatch(optionField, /query\.(limit|per_page|page_size)\s*=/)
  assert.match(apiClientSource, /sanitizeOptionsParams/)
  assert.match(queryPolicy, /isOptionsEndpoint/)
  assert.match(queryPolicy, /'limit'/)
  assert.match(queryPolicy, /'per_page'/)
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

const goodsReceiptScanInView = await readFile(
  new URL('../src/modules/workflow/GoodsReceiptScanInView.vue', import.meta.url),
  'utf8',
)
const routerSource = await readFile(new URL('../src/router/index.ts', import.meta.url), 'utf8')

test('goods receipt uses one dedicated scan-in workspace with camera and one stock post', () => {
  assert.match(modules, /label: 'Scan Masuk'/)
  assert.match(modules, /handler: 'goods-receipt-scan-in'/)
  assert.match(resourceWorkbench, /goods-receipt-scan-in/)
  assert.match(routerSource, /goods-receipts\/:id\/scan-in/)
  assert.match(goodsReceiptScanInView, /getUserMedia/)
  assert.match(goodsReceiptScanInView, /BrowserQRCodeReader/)
  assert.match(goodsReceiptScanInView, /PreviewGoodsReceiptScan/)
  assert.match(goodsReceiptScanInView, /PostScannedGoodsReceiptToStock/)
  assert.match(goodsReceiptScanInView, /serial_scans/)
  assert.match(goodsReceiptScanInView, /qty_scans/)
  assert.match(goodsReceiptScanInView, /Post ke Stok/)
})

test('goods receipt scan workspace keeps QR generation and printable preview together', () => {
  assert.match(goodsReceiptScanInView, /GenerateGoodsReceiptQR/)
  assert.match(goodsReceiptScanInView, /generated_qr_codes/)
  assert.match(goodsReceiptScanInView, /<GoodsReceiptQrModal/)
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

test('resource actions keep hidden technical IDs available for API path parameters', () => {
  assert.match(modules, /idCandidates: \['id_company', 'company_id', 'id'\]/)
  assert.match(resourceIdUtils, /key\.startsWith\('id_'\)/)
  assert.match(resourceIdUtils, /key\.endsWith\('_id'\)/)
  assert.match(resourceIdUtils, /resolveResourcePathValue/)
  assert.match(resourceWorkbench, /resolveResourceId\(row, definition\.value\?\.idCandidates/)
  assert.match(resourceWorkbench, /resolveResourcePathValue\(/)
})

test('large item and purchase-order selectors use searchable resource table modals', async () => {
  const fieldOptions = await readFile(
    new URL('../src/config/field-options.ts', import.meta.url),
    'utf8',
  )
  const resourcePickers = await readFile(
    new URL('../src/config/field-resource-pickers.ts', import.meta.url),
    'utf8',
  )
  const resourcePicker = await readFile(
    new URL('../src/components/data/ApiResourcePicker.vue', import.meta.url),
    'utf8',
  )
  const schemaFields = await readFile(
    new URL('../src/components/data/SchemaFields.vue', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(fieldOptions, /item_id: option\(/)
  assert.doesNotMatch(fieldOptions, /po_id: option\(/)
  assert.match(resourcePickers, /item_id:\s*\{[\s\S]*operationId: 'FindAllItems'/)
  assert.match(
    resourcePickers,
    /po_id:\s*\{[\s\S]*operationId: 'FindEligiblePurchaseOrdersForReceipt'/,
  )
  assert.match(resourcePickers, /selectionEffects:\s*\{[\s\S]*uom_id: 'base_uom_id'/)
  assert.match(resourcePicker, /@row-dblclick="choose\(\$event\)"/)
  assert.match(resourcePicker, /Klik dua kali pada baris/)
  assert.match(resourcePicker, /server-side/)
  assert.match(schemaFields, /<ApiResourcePicker/)
})

test('schema forms use semantic date, datetime, integer, number, and text inputs', async () => {
  const schemaUtils = await readFile(new URL('../src/utils/schema.ts', import.meta.url), 'utf8')
  const schemaFields = await readFile(
    new URL('../src/components/data/SchemaFields.vue', import.meta.url),
    'utf8',
  )
  const schemaOverrides = await readFile(
    new URL('../src/config/operation-schema-overrides.ts', import.meta.url),
    'utf8',
  )
  assert.match(schemaUtils, /resolvedSchemaFormat/)
  assert.match(schemaUtils, /return 'date-time'/)
  assert.match(schemaUtils, /return 'date'/)
  assert.match(schemaUtils, /schema\.type === 'integer' \|\| schema\.type === 'number'/)
  assert.match(schemaUtils, /date\.toISOString\(\)/)
  assert.match(schemaFields, /child\.type === 'integer' \? '1'/)
  assert.match(schemaFields, /:min="child\.minimum"/)
  assert.match(schemaFields, /:max="child\.maximum"/)
  assert.match(schemaOverrides, /CompleteDisposal:[\s\S]*?disposal_date:[\s\S]*?date-time/)
  assert.match(schemaOverrides, /ReportLoss:[\s\S]*?loss_date:[\s\S]*?date-time/)
})

test('remote Select2 preserves selected values and shows server-search feedback', () => {
  assert.match(appSelect, /remoteSearch\?: boolean/)
  assert.match(appSelect, /minimumInputLength\?: number/)
  assert.match(appSelect, /emit\('search', term\)/)
  assert.match(appSelect, /Ketik minimal \$\{props\.minimumInputLength\} karakter/)
  assert.match(appSelect, /Mencari data…/)
  assert.match(apiOptionField, /mergeWithSelected/)
  assert.match(apiOptionField, /selectedFallbackOptions/)
  assert.match(apiClientSource, /options: \{ signal\?: AbortSignal \} = \{\}/)
})

test('catalog item menu groups master item part number and supplier item', () => {
  assert.match(navigation, /label: 'Barang'[\s\S]*label: 'Master Barang'/)
  assert.match(navigation, /label: 'Part Number'/)
  assert.match(navigation, /label: 'Barang Pemasok'/)
  assert.match(appSidebar, /nav-subgroup__children/)
  assert.match(appHorizontalNav, /horizontal-nav__subgroup/)
})

test('multiple dropdowns use compact summaries and checkbox choices', () => {
  assert.match(appSelect, /multipleSummaryLabel/)
  assert.match(appSelect, /data dipilih/)
  assert.match(appSelect, /select2-results__checkbox/)
  assert.match(appSelect, /select2-results__option--multiple/)
  assert.match(apiOptionField, /compactCompositeLabel/)
  assert.match(apiOptionField, /optionDescription/)
})

test('category group detail only exposes replace selection workflow', () => {
  const categoryGroupBlock = modules.slice(
    modules.indexOf("'category-groups': crud"),
    modules.indexOf('categories: crud'),
  )
  assert.match(categoryGroupBlock, /ReplaceCategoryGroupCategories/)
  assert.doesNotMatch(categoryGroupBlock, /AddCategoryGroupCategories/)
  assert.doesNotMatch(categoryGroupBlock, /Tambah Kategori/)
})

test('inventory navigation follows stock request distribution and control workflows', () => {
  assert.match(navigation, /label: 'Persediaan'/)
  assert.match(navigation, /label: 'Permintaan & Pengeluaran'/)
  assert.match(navigation, /label: 'Pengambilan Langsung'/)
  assert.match(navigation, /label: 'Distribusi'/)
  assert.match(navigation, /label: 'Kontrol Stok'/)
  assert.match(navigation, /label: 'Rekonsiliasi Stok'/)
  assert.match(navigation, /label: 'Pemeliharaan Sistem'/)
})

test('asset navigation separates warehouse direct migration and assignment lifecycles', () => {
  assert.match(navigation, /label: 'Ringkasan Aset'/)
  assert.match(navigation, /label: 'Aset dari Gudang'/)
  assert.match(navigation, /label: 'Aset Langsung'/)
  assert.match(navigation, /label: 'Migrasi \/ Aset Lama'/)
  assert.match(navigation, /label: 'Penugasan Aktif'/)
  assert.match(navigation, /label: 'Pengembalian Aset'/)
  assert.match(navigation, /label: 'Transfer Penanggung Jawab'/)
})

test('frontend implements direct acquisition and existing asset migration workflows', async () => {
  const router = await readFile(new URL('../src/router/index.ts', import.meta.url), 'utf8')
  const directAssetView = await readFile(
    new URL('../src/modules/assets/DirectAssetAcquisitionView.vue', import.meta.url),
    'utf8',
  )
  const migrationView = await readFile(
    new URL('../src/modules/assets/AssetMigrationView.vue', import.meta.url),
    'utf8',
  )
  assert.match(router, /assets\/direct-acquisitions/)
  assert.match(router, /assets\/migrations/)
  assert.match(router, /inventory\/direct-issues/)
  assert.match(directAssetView, /directAcquisitions/)
  assert.match(directAssetView, /Tambah Aset Langsung/)
  assert.match(migrationView, /Preview & Validasi/)
  assert.match(
    migrationView,
    /Commit Asset Migrations|Commit \{\{ selected\?\.valid_rows \}\} Aset/,
  )
})

test('reports are grouped by business area and procurement/audit endpoints are implemented', async () => {
  const reportsView = await readFile(
    new URL('../src/modules/reports/ReportsView.vue', import.meta.url),
    'utf8',
  )
  assert.match(reportsView, /label: 'Persediaan'/)
  assert.match(reportsView, /label: 'Pengadaan'/)
  assert.match(reportsView, /label: 'Pemakaian & Distribusi'/)
  assert.match(reportsView, /label: 'Aset'/)
  assert.match(reportsView, /label: 'Audit'/)
  assert.match(reportsView, /\/api\/v1\/reports\/purchase-orders/)
  assert.match(reportsView, /\/api\/v1\/reports\/supplier-performance/)
  assert.match(reportsView, /\/api\/v1\/reports\/posting-history/)
  assert.match(reportsView, /\/api\/v1\/reports\/failed-transactions/)
  assert.doesNotMatch(reportsView, /Endpoint laporan untuk kelompok ini akan\s+ditambahkan/)
})

test('transaction actions use backend workflow statuses without legacy aliases', () => {
  assert.match(modules, /statuses: \['READY_TO_SHIP'\]/)
  assert.match(modules, /statuses: \['SHIPPED', 'PARTIALLY_RECEIVED'\]/)
  assert.match(modules, /statuses: \['RECEIVED_BY_DESTINATION'\]/)
  assert.match(modules, /statuses: \['COUNTING'\]/)
  assert.doesNotMatch(modules, /statuses: \['PREPARED'\]/)
  assert.doesNotMatch(modules, /statuses: \['IN_TRANSIT'/)
  assert.doesNotMatch(modules, /statuses: \['DRAFT', 'SCANNED'\]/)
})

test('frontend exposes stock-check and traceable backend workflow contracts', async () => {
  const metadata = JSON.parse(
    await readFile(new URL('../src/generated/api-metadata.json', import.meta.url), 'utf8'),
  )
  assert.ok(metadata.operations.CheckItemRequestStock)
  assert.ok(metadata.operations.MarkItemRequestWaitingPurchase)
  assert.ok(metadata.operations.CompleteItemRequest)
  assert.ok(metadata.operations.UpdateGoodsReceiptLines)
  assert.ok(metadata.operations.FindAssetAssignments)
  assert.ok(metadata.operations.FindAssetAssignmentByID)
  assert.ok(metadata.operations.CreatePurchaseOrder.body.properties.source_request_id)
  assert.ok(
    metadata.operations.CreatePurchaseOrder.body.properties.lines.items.properties.request_line_id,
  )
  assert.match(modules, /operationId: 'CheckItemRequestStock'/)
  assert.match(modules, /operationId: 'UpdateGoodsReceiptLines'/)
  assert.match(modules, /'asset-assignments': crud/)
})

test('delivery workflow exposes picking packing and scan stages', async () => {
  const metadata = JSON.parse(
    await readFile(new URL('../src/generated/api-metadata.json', import.meta.url), 'utf8'),
  )
  assert.ok(metadata.operations.StartDeliveryOrderPicking)
  assert.ok(metadata.operations.ConfirmDeliveryOrderPicking)
  assert.ok(metadata.operations.ConfirmDeliveryOrderPacking)
  assert.match(modules, /operationId: 'StartDeliveryOrderPicking'/)
  assert.match(modules, /operationId: 'ConfirmDeliveryOrderPicking'/)
  assert.match(modules, /operationId: 'ConfirmDeliveryOrderPacking'/)
  assert.match(modules, /statuses: \['PICKING'\]/)
  assert.match(modules, /statuses: \['PACKING'\]/)
  const router = await readFile(new URL('../src/router/index.ts', import.meta.url), 'utf8')
  const scanView = await readFile(
    new URL('../src/modules/workflow/DeliveryOrderScanView.vue', import.meta.url),
    'utf8',
  )
  assert.match(router, /delivery-orders\/:id\/scan-out/)
  assert.match(router, /delivery-orders\/:id\/scan-in/)
  assert.match(modules, /handler: 'delivery-order-scan-out'/)
  assert.match(modules, /handler: 'delivery-order-scan-in'/)
  assert.match(scanView, /PreviewDeliveryOrderScanOut/)
  assert.match(scanView, /PostDeliveryOrderScannedOut/)
  assert.match(scanView, /PreviewDeliveryOrderReceive/)
  assert.match(scanView, /PostDeliveryOrderReceived/)
  assert.match(scanView, /BrowserQRCodeReader/)
})

test('complaint workflow exposes return and replacement lifecycle actions', async () => {
  const metadata = JSON.parse(
    await readFile(new URL('../src/generated/api-metadata.json', import.meta.url), 'utf8'),
  )
  for (const operation of [
    'ApproveComplaintReturn',
    'RegisterComplaintReturn',
    'StartComplaintReplacement',
    'MarkComplaintReplacementShipped',
    'ConfirmComplaintReplacement',
  ]) {
    assert.ok(metadata.operations[operation])
    assert.match(modules, new RegExp(`operationId: '${operation}'`))
  }
  assert.match(modules, /statuses: \['APPROVED_RETURN'\]/)
  assert.match(modules, /statuses: \['REPLACEMENT_PROCESS'\]/)
  assert.match(modules, /statuses: \['REPLACEMENT_SHIPPED'\]/)
})

test('request-based and direct issues use distinct issue modes', async () => {
  const router = await readFile(new URL('../src/router/index.ts', import.meta.url), 'utf8')
  const workbench = await readFile(
    new URL('../src/modules/resource/ResourceWorkbenchView.vue', import.meta.url),
    'utf8',
  )
  const pickerConfig = await readFile(
    new URL('../src/config/field-resource-pickers.ts', import.meta.url),
    'utf8',
  )
  assert.match(router, /issue_mode: 'DIRECT'/)
  assert.match(workbench, /issue_mode: 'REQUEST'/)
  assert.match(workbench, /hydrateTransactionReference\('usage-request'/)
  assert.match(workbench, /request_line_id: line\.request_line_id/)
  assert.match(pickerConfig, /source_request_id:[\s\S]*FindAllItemRequests/)
})

test('minimum and low stock are presented in one workspace', async () => {
  const minimumView = await readFile(
    new URL('../src/modules/inventory/MinimumStockControlView.vue', import.meta.url),
    'utf8',
  )
  const router = await readFile(new URL('../src/router/index.ts', import.meta.url), 'utf8')
  assert.match(navigation, /label: 'Stok Minimum & Stok Rendah'/)
  assert.match(router, /inventory\/minimum-low-stock/)
  assert.match(minimumView, /module-key="active"/)
  assert.match(minimumView, /'stock-thresholds'/)
  assert.match(minimumView, /'low-stock'/)
})

test('direct asset registration supports an optional initial assignment', async () => {
  const directAssetView = await readFile(
    new URL('../src/modules/assets/DirectAssetAcquisitionView.vue', import.meta.url),
    'utf8',
  )
  assert.match(directAssetView, /assignImmediately/)
  assert.match(directAssetView, /initial_assignment:/)
  assert.match(directAssetView, /Langsung tugaskan aset setelah registrasi/)
  assert.match(directAssetView, /responsibility_type/)
})

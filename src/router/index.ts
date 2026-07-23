import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/modules/auth/auth.store'
import { tokenStorage } from '@/services/token-storage'
import { resourceModuleList } from '@/config/modules'

const resourceRoutes: RouteRecordRaw[] = resourceModuleList.map((module) => ({
  path: module.route.replace(/^\//, ''),
  name: `resource-${module.key}`,
  component: () => import('@/modules/resource/ResourceWorkbenchView.vue'),
  props: { moduleKey: module.key },
  meta: { permission: module.readPermission, superAdminOnly: module.superAdminOnly },
}))

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/modules/dashboard/DashboardView.vue'),
          meta: { permission: 'dashboard.read' },
        },
        {
          path: 'procurement/goods-receipts/:id/scan-in',
          name: 'goods-receipt-scan-in',
          component: () => import('@/modules/workflow/GoodsReceiptScanInView.vue'),
          meta: { permission: 'transaction.goods_receipts.scan' },
        },
        {
          path: 'inventory/delivery-orders/:id/scan-out',
          name: 'delivery-order-scan-out',
          component: () => import('@/modules/workflow/DeliveryOrderScanView.vue'),
          props: { mode: 'keluar' },
          meta: { permission: 'transaction.delivery_orders.scan_out' },
        },
        {
          path: 'inventory/delivery-orders/:id/scan-in',
          name: 'delivery-order-scan-in',
          component: () => import('@/modules/workflow/DeliveryOrderScanView.vue'),
          props: { mode: 'masuk' },
          meta: { permission: 'transaction.delivery_orders.receive' },
        },
        {
          path: 'inventory/minimum-low-stock',
          name: 'inventory-minimum-low-stock',
          component: () => import('@/modules/inventory/MinimumStockControlView.vue'),
          meta: { permission: 'inventory.stock_thresholds.read' },
        },
        {
          path: 'inventory/direct-issues',
          name: 'inventory-direct-issues',
          component: () => import('@/modules/resource/ResourceWorkbenchView.vue'),
          props: { moduleKey: 'item-usages' },
          meta: {
            permission: 'transaction.item_usages.read',
            pageTitle: 'Pengambilan Langsung',
            pageDescription:
              'Catat ATK, tisu, consumable, dan barang habis pakai yang langsung diserahkan kepada pegawai, divisi, lokasi, atau kendaraan.',
            createLabel: 'Catat Pengambilan',
            createDefaults: { issue_mode: 'DIRECT', usage_type: 'OPERATIONAL' },
          },
        },
        {
          path: 'assets/overview',
          name: 'asset-overview',
          component: () => import('@/modules/assets/AssetOverviewView.vue'),
          meta: { permission: 'inventory.assets.read' },
        },
        {
          path: 'assets/from-warehouse',
          name: 'assets-from-warehouse',
          component: () => import('@/modules/resource/ResourceWorkbenchView.vue'),
          props: { moduleKey: 'assets' },
          meta: {
            permission: 'inventory.assets.read',
            pageTitle: 'Aset dari Gudang',
            pageDescription:
              'Lengkapi profil dan lifecycle item serial berstatus aset yang sudah diterima serta tersedia di warehouse.',
            detailActionOperationIds: [
              'AssignAsset',
              'CreateMaintenance',
              'ReportLoss',
              'CreateDisposal',
              'CreateHandover',
            ],
          },
        },
        {
          path: 'assets/assignments',
          name: 'asset-assignments',
          component: () => import('@/modules/resource/ResourceWorkbenchView.vue'),
          props: { moduleKey: 'asset-assignments' },
          meta: {
            permission: 'inventory.asset_assignments.read',
            pageTitle: 'Assignment Aktif',
            pageDescription:
              'Pilih aset tersedia lalu assign kepada pegawai, divisi, lokasi, atau kendaraan.',
            detailActionOperationIds: ['CreateHandover'],
          },
        },
        {
          path: 'assets/returns',
          name: 'asset-returns',
          component: () => import('@/modules/resource/ResourceWorkbenchView.vue'),
          props: { moduleKey: 'asset-assignments' },
          meta: {
            permission: 'inventory.asset_assignments.read',
            pageTitle: 'Pengembalian Aset',
            pageDescription:
              'Proses aset yang dikembalikan, cek kondisi, dan kembalikan unit ke warehouse.',
            detailActionOperationIds: ['ReturnAsset', 'CreateMaintenance', 'CreateHandover'],
          },
        },
        {
          path: 'assets/transfers',
          name: 'asset-transfers',
          component: () => import('@/modules/resource/ResourceWorkbenchView.vue'),
          props: { moduleKey: 'asset-assignments' },
          meta: {
            permission: 'inventory.asset_assignments.read',
            pageTitle: 'Transfer Penanggung Jawab',
            pageDescription:
              'Pindahkan tanggung jawab aset antarpegawai, divisi, lokasi, atau kendaraan tanpa transaksi stok gudang.',
            detailActionOperationIds: ['TransferAsset', 'CreateHandover'],
          },
        },
        {
          path: 'assets/direct-acquisitions',
          name: 'asset-direct-acquisitions',
          component: () => import('@/modules/assets/DirectAssetAcquisitionView.vue'),
          meta: { permission: 'inventory.asset_direct_acquisitions.read' },
        },
        {
          path: 'assets/migrations',
          name: 'asset-migrations',
          component: () => import('@/modules/assets/AssetMigrationView.vue'),
          meta: { permission: 'inventory.asset_migrations.read' },
        },
        ...resourceRoutes,
        {
          path: 'approvals',
          name: 'approvals',
          component: () => import('@/modules/approvals/ApprovalsView.vue'),
          meta: {
            permissionAny: [
              'approvals.inbox.read',
              'transaction.purchase_orders.approve',
              'transaction.purchase_orders.reject',
              'transaction.item_requests.approve',
              'inventory.stock_adjustments.approve',
              'inventory.stock_opnames.review',
              'inventory.asset_disposals.approve',
              'inventory.asset_losses.approve',
              'transaction.landed_costs.approve',
            ],
          },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/modules/reports/ReportsView.vue'),
          meta: {
            permissionAny: [
              'reports.inventory.read',
              'reports.inventory_valuation.read',
              'reports.assets.read',
              'reports.asset_valuation.read',
              'reports.responsibilities.read',
              'reports.asset_maintenances.read',
              'reports.procurement.read',
              'reports.audit.read',
              'inventory.asset_depreciation.read',
            ],
          },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/modules/profile/ProfileView.vue'),
        },
        {
          path: 'maintenance/recycle-bin',
          name: 'recycle-bin',
          component: () => import('@/modules/maintenance/RecycleBinView.vue'),
          meta: { superAdminOnly: true },
        },
        {
          path: 'forbidden',
          name: 'forbidden',
          component: () => import('@/views/ForbiddenView.vue'),
        },
        // Compatibility redirects from the first AIMS prototype.
        { path: 'master/:key', redirect: (to) => `/catalog/${String(to.params.key)}` },
        { path: 'notifications', redirect: '/operations/notifications' },
      ],
    },
    { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.path === '/login' && tokenStorage.accessToken()) return '/'
    return true
  }
  if (!tokenStorage.accessToken()) return { path: '/login', query: { redirect: to.fullPath } }
  if (!auth.user) {
    const valid = await auth.restoreSession()
    if (!valid) return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'forbidden') return true
  if (to.meta.superAdminOnly && !auth.isSuperAdmin) return { name: 'forbidden' }
  const permission = to.meta.permission as string | undefined
  if (permission && !auth.can(permission)) return { name: 'forbidden' }
  const any = to.meta.permissionAny as string[] | undefined
  if (any?.length && !any.some((item) => auth.can(item))) return { name: 'forbidden' }
  return true
})

export default router

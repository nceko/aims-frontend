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
          meta: { permission: 'transaction.goods_receipts.post_scanned_to_stock' },
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
            createDefaults: { usage_type: 'OPERATIONAL' },
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
          component: () => import('@/modules/workflow/PlannedWorkflowView.vue'),
          props: {
            title: 'Aset Langsung',
            description:
              'Registrasi aset yang dikirim langsung ke lokasi atau tidak pernah disimpan sebagai persediaan warehouse.',
            steps: [
              'Pilih sumber perolehan aset',
              'Isi item, serial, asset tag, harga, dan tanggal perolehan',
              'Tentukan lokasi serta penanggung jawab awal',
              'Upload invoice, garansi, foto, atau dokumen pendukung',
              'Generate QR dan aktifkan aset',
            ],
            fields: [
              'Sumber perolehan',
              'Item / jenis aset',
              'Serial number',
              'Asset tag',
              'Harga perolehan',
              'Tanggal perolehan',
              'Supplier / invoice',
              'Lokasi fisik',
              'Penanggung jawab',
              'Garansi dan lampiran',
            ],
            backendNeeds: [
              'Endpoint create direct asset acquisition',
              'Transaksi atomik item unit + asset profile + initial assignment',
              'Generate QR/asset tag tanpa menambah stock balance warehouse',
              'Attachment, audit log, dan validasi duplikasi serial',
            ],
            relatedRoute: '/assets/register',
            relatedLabel: 'Buka Register Aset',
          },
          meta: { permission: 'inventory.assets.read' },
        },
        {
          path: 'assets/migrations',
          name: 'asset-migrations',
          component: () => import('@/modules/workflow/PlannedWorkflowView.vue'),
          props: {
            title: 'Migrasi / Aset Existing',
            description:
              'Masukkan aset lama yang sudah dimiliki perusahaan tanpa membuat penerimaan barang baru.',
            steps: [
              'Siapkan template data aset existing',
              'Validasi asset tag, serial, lokasi, dan penanggung jawab',
              'Import data dan tampilkan hasil validasi',
              'Perbaiki data gagal sebelum commit',
              'Generate QR dan tetapkan saldo awal nilai aset',
            ],
            fields: [
              'Nomor aset lama',
              'Item / kategori',
              'Serial number',
              'Tanggal perolehan',
              'Nilai perolehan',
              'Akumulasi penyusutan awal',
              'Kondisi',
              'Lokasi sekarang',
              'Penanggung jawab sekarang',
              'Dokumen sumber',
            ],
            backendNeeds: [
              'Endpoint import preview dan commit aset existing',
              'Validasi duplikasi asset tag dan serial number',
              'Pembuatan item unit, asset profile, dan assignment awal',
              'Pencatatan opening balance penyusutan dan audit import',
            ],
            relatedRoute: '/assets/register',
            relatedLabel: 'Buka Register Aset',
          },
          meta: { permission: 'inventory.assets.read' },
        },
        ...resourceRoutes,
        {
          path: 'approvals',
          name: 'approvals',
          component: () => import('@/modules/approvals/ApprovalsView.vue'),
          meta: {
            permissionAny: [
              'dashboard.read',
              'transaction.purchase_orders.update',
              'transaction.item_requests.approve',
              'inventory.stock_adjustments.approve',
              'inventory.stock_opnames.approve',
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

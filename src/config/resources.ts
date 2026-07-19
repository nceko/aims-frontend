import { endpoints } from './endpoints'

export interface ResourceDefinition {
  key: string
  title: string
  description: string
  endpoint: string
  createPermission?: string
  primaryFieldCandidates?: string[]
}

export const resources: Record<string, ResourceDefinition> = {
  companies: {
    key: 'companies',
    title: 'Company',
    description: 'Kelola perusahaan yang menggunakan AIMS.',
    endpoint: endpoints.master.companies,
    createPermission: 'master.companies.create',
  },
  locations: {
    key: 'locations',
    title: 'Location',
    description: 'Kelola lokasi operasional per perusahaan.',
    endpoint: endpoints.master.locations,
    createPermission: 'master.locations.create',
  },
  warehouses: {
    key: 'warehouses',
    title: 'Warehouse',
    description: 'Kelola gudang dan titik penyimpanan barang.',
    endpoint: endpoints.master.warehouses,
    createPermission: 'master.warehouses.create',
  },
  'category-groups': {
    key: 'category-groups',
    title: 'Category Group',
    description: 'Atur kelompok kategori untuk pembatasan context pengguna.',
    endpoint: endpoints.master.categoryGroups,
    createPermission: 'master.category_groups.create',
  },
  categories: {
    key: 'categories',
    title: 'Category',
    description: 'Kelola kategori item dan aset.',
    endpoint: endpoints.master.categories,
    createPermission: 'master.categories.create',
  },
  uoms: {
    key: 'uoms',
    title: 'Unit of Measure',
    description: 'Kelola satuan dasar dan konversi item.',
    endpoint: endpoints.master.uoms,
    createPermission: 'master.uoms.create',
  },
  brands: {
    key: 'brands',
    title: 'Brand',
    description: 'Kelola merek item dan aset.',
    endpoint: endpoints.master.brands,
    createPermission: 'master.brands.create',
  },
  items: {
    key: 'items',
    title: 'Item',
    description: 'Kelola katalog item, part number, tracking, dan supplier.',
    endpoint: endpoints.master.items,
    createPermission: 'master.items.create',
  },
  suppliers: {
    key: 'suppliers',
    title: 'Supplier',
    description: 'Kelola data supplier dan informasi kontaknya.',
    endpoint: endpoints.master.suppliers,
    createPermission: 'master.suppliers.create',
  },
  divisions: {
    key: 'divisions',
    title: 'Division',
    description: 'Kelola struktur divisi perusahaan.',
    endpoint: endpoints.master.divisions,
    createPermission: 'master.divisions.create',
  },
  employees: {
    key: 'employees',
    title: 'Employee',
    description: 'Kelola data karyawan dan penanggung jawab aset.',
    endpoint: endpoints.master.employees,
    createPermission: 'master.employees.create',
  },
  vehicles: {
    key: 'vehicles',
    title: 'Vehicle',
    description: 'Kelola kendaraan sebagai objek tanggung jawab dan penggunaan.',
    endpoint: endpoints.master.vehicles,
    createPermission: 'master.vehicles.create',
  },
  'purchase-orders': {
    key: 'purchase-orders',
    title: 'Purchase Order',
    description: 'Buat, approve, dan pantau pemenuhan Purchase Order.',
    endpoint: endpoints.procurement.purchaseOrders,
    createPermission: 'transaction.purchase_orders.create',
  },
  'goods-receipts': {
    key: 'goods-receipts',
    title: 'Penerimaan Barang',
    description: 'Catat pemeriksaan, QR, dan posting barang masuk ke stok.',
    endpoint: endpoints.procurement.goodsReceipts,
    createPermission: 'transaction.goods_receipts.create',
  },
  complaints: {
    key: 'complaints',
    title: 'Komplain Vendor',
    description: 'Pantau komplain atas barang yang diterima dari supplier.',
    endpoint: endpoints.procurement.complaints,
    createPermission: 'transaction.complaints.create',
  },
  stocks: {
    key: 'stocks',
    title: 'Stock Balance',
    description: 'Lihat posisi stok berdasarkan gudang, item, part, dan UOM.',
    endpoint: endpoints.inventory.stocks,
  },
  'item-units': {
    key: 'item-units',
    title: 'Item Unit / QR',
    description: 'Telusuri unit serial dan riwayat QR.',
    endpoint: endpoints.inventory.itemUnits,
  },
  'item-requests': {
    key: 'item-requests',
    title: 'Permintaan Barang',
    description: 'Buat dan pantau permintaan internal barang.',
    endpoint: endpoints.inventory.itemRequests,
    createPermission: 'transaction.item_requests.create',
  },
  'delivery-orders': {
    key: 'delivery-orders',
    title: 'Surat Jalan',
    description: 'Kelola persiapan, pengiriman, dan penerimaan barang.',
    endpoint: endpoints.inventory.deliveryOrders,
    createPermission: 'transaction.delivery_orders.create',
  },
  'item-usages': {
    key: 'item-usages',
    title: 'Pemakaian Barang',
    description: 'Catat konsumsi atau penggunaan barang.',
    endpoint: endpoints.inventory.itemUsages,
    createPermission: 'transaction.item_usages.create',
  },
  'stock-adjustments': {
    key: 'stock-adjustments',
    title: 'Stock Adjustment',
    description: 'Kelola penyesuaian stok yang memerlukan approval.',
    endpoint: endpoints.inventory.stockAdjustments,
    createPermission: 'inventory.stock_adjustments.create',
  },
  'stock-opnames': {
    key: 'stock-opnames',
    title: 'Stock Opname',
    description: 'Jadwalkan, hitung, review, dan posting hasil opname.',
    endpoint: endpoints.inventory.stockOpnames,
    createPermission: 'inventory.stock_opnames.create',
  },
  'low-stock': {
    key: 'low-stock',
    title: 'Low Stock',
    description: 'Pantau item yang berada di bawah batas minimum.',
    endpoint: endpoints.inventory.lowStockNotifications,
  },
  'asset-register': {
    key: 'asset-register',
    title: 'Asset Register',
    description: 'Kelola profil, assignment, dan histori aset.',
    endpoint: endpoints.assets.root,
  },
  'asset-maintenances': {
    key: 'asset-maintenances',
    title: 'Maintenance Asset',
    description: 'Pantau pekerjaan maintenance aset.',
    endpoint: endpoints.assets.maintenances,
  },
  'asset-loss-cases': {
    key: 'asset-loss-cases',
    title: 'Asset Hilang',
    description: 'Kelola investigasi dan penyelesaian aset hilang.',
    endpoint: endpoints.assets.losses,
  },
  'asset-disposals': {
    key: 'asset-disposals',
    title: 'Disposal Asset',
    description: 'Kelola proses write-off atau disposal aset.',
    endpoint: endpoints.assets.disposals,
  },
  users: {
    key: 'users',
    title: 'Users',
    description: 'Kelola akun, status, akses, dan sesi pengguna.',
    endpoint: endpoints.administration.users,
    createPermission: 'iam.users.create',
  },
  roles: {
    key: 'roles',
    title: 'Roles',
    description: 'Kelola role dan kumpulan permission.',
    endpoint: endpoints.administration.roles,
    createPermission: 'iam.roles.create',
  },
  permissions: {
    key: 'permissions',
    title: 'Permissions',
    description: 'Lihat permission yang tersedia pada backend.',
    endpoint: endpoints.administration.permissions,
  },
  'audit-logs': {
    key: 'audit-logs',
    title: 'Audit Logs',
    description: 'Telusuri aktivitas perubahan data di AIMS.',
    endpoint: endpoints.administration.auditLogs,
  },
  'login-history': {
    key: 'login-history',
    title: 'Login History',
    description: 'Pantau histori autentikasi pengguna.',
    endpoint: endpoints.administration.loginHistories,
  },
  sessions: {
    key: 'sessions',
    title: 'Active Sessions',
    description: 'Pantau dan kelola sesi pengguna yang aktif.',
    endpoint: endpoints.administration.activeSessions,
  },
}

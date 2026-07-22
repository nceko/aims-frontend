import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Calculator,
  ClipboardCheck,
  FileArchive,
  FileBarChart,
  Gauge,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Wrench,
} from '@lucide/vue'
import type { Component } from 'vue'

export interface NavItem {
  label: string
  to?: string
  icon?: Component
  permission?: string
  permissionAny?: string[]
  superAdminOnly?: boolean
  children?: NavItem[]
}

export const navigation: NavItem[] = [
  { label: 'Dasbor', to: '/', icon: Gauge, permission: 'dashboard.read' },
  {
    label: 'Organisasi',
    icon: Building2,
    children: [
      {
        label: 'Perusahaan',
        to: '/organization/companies',
        permission: 'organization.companies.read',
      },
      {
        label: 'Tipe Lokasi',
        to: '/organization/location-types',
        permission: 'organization.location_types.read',
      },
      {
        label: 'Lokasi',
        to: '/organization/locations',
        permission: 'organization.locations.read',
      },
      {
        label: 'Gudang',
        to: '/organization/warehouses',
        permission: 'warehouse.warehouses.read',
      },
      {
        label: 'Divisi',
        to: '/organization/divisions',
        permission: 'organization.divisions.read',
      },
      {
        label: 'Pegawai',
        to: '/organization/employees',
        permission: 'organization.employees.read',
      },
      {
        label: 'Direktori Penanggung Jawab',
        to: '/organization/responsibilities',
        permission: 'organization.responsibilities.read',
      },
      {
        label: 'Kendaraan',
        to: '/organization/vehicles',
        permission: 'organization.vehicles.read',
      },
    ],
  },
  {
    label: 'Katalog',
    icon: Boxes,
    children: [
      {
        label: 'Kelompok Kategori',
        to: '/catalog/category-groups',
        permission: 'catalog.category_groups.read',
      },
      { label: 'Kategori', to: '/catalog/categories', permission: 'catalog.categories.read' },
      { label: 'UOM', to: '/catalog/uoms', permission: 'catalog.uoms.read' },
      { label: 'Merek', to: '/catalog/brands', permission: 'catalog.brands.read' },
      {
        label: 'Barang',
        permissionAny: [
          'catalog.items.read',
          'catalog.item_part_numbers.read',
          'catalog.item_suppliers.read',
          'catalog.item_uom_conversions.read',
        ],
        children: [
          { label: 'Master Barang', to: '/catalog/items', permission: 'catalog.items.read' },
          {
            label: 'Part Number',
            to: '/catalog/item-part-numbers',
            permission: 'catalog.item_part_numbers.read',
          },
          {
            label: 'Barang Pemasok',
            to: '/catalog/item-suppliers',
            permission: 'catalog.item_suppliers.read',
          },
          {
            label: 'Konversi UOM',
            to: '/catalog/item-uom-conversions',
            permission: 'catalog.item_uom_conversions.read',
          },
        ],
      },
      { label: 'Pemasok', to: '/catalog/suppliers', permission: 'catalog.suppliers.read' },
      {
        label: 'Harga Pembelian',
        to: '/catalog/purchase-prices',
        permission: 'catalog.purchase_prices.read',
      },
    ],
  },
  {
    label: 'Pengadaan',
    icon: ShoppingCart,
    children: [
      {
        label: 'Pesanan Pembelian',
        to: '/procurement/purchase-orders',
        permission: 'transaction.purchase_orders.read',
      },
      {
        label: 'Penerimaan Barang',
        to: '/procurement/goods-receipts',
        permission: 'transaction.goods_receipts.read',
      },
      {
        label: 'Biaya Perolehan',
        to: '/procurement/landed-costs',
        permission: 'transaction.landed_costs.read',
      },
      {
        label: 'Komplain / Retur Vendor',
        to: '/procurement/complaints',
        permission: 'transaction.complaints.read',
      },
    ],
  },
  {
    label: 'Persediaan',
    icon: Warehouse,
    children: [
      {
        label: 'Persediaan',
        permissionAny: [
          'inventory.stocks.read',
          'inventory.item_units.read',
          'inventory.stock_thresholds.read',
          'inventory.cost_balances.read',
          'inventory.cost_movements.read',
        ],
        children: [
          { label: 'Saldo Stok', to: '/inventory/stocks', permission: 'inventory.stocks.read' },
          {
            label: 'Unit Barang & QR',
            to: '/inventory/item-units',
            permission: 'inventory.item_units.read',
          },
          {
            label: 'Stok Minimum & Stok Rendah',
            to: '/inventory/minimum-low-stock',
            permission: 'inventory.stock_thresholds.read',
          },
          {
            label: 'Nilai Persediaan',
            to: '/inventory/cost-balances',
            permission: 'inventory.cost_balances.read',
          },
          {
            label: 'Pergerakan Nilai',
            to: '/inventory/cost-movements',
            permission: 'inventory.cost_movements.read',
          },
        ],
      },
      {
        label: 'Permintaan & Pengeluaran',
        permissionAny: ['transaction.item_requests.read', 'transaction.item_usages.read'],
        children: [
          {
            label: 'Permintaan Barang',
            to: '/inventory/item-requests',
            permission: 'transaction.item_requests.read',
          },
          {
            label: 'Pengeluaran Berdasarkan Permintaan',
            to: '/inventory/item-usages',
            permission: 'transaction.item_usages.read',
          },
          {
            label: 'Pengambilan Langsung',
            to: '/inventory/direct-issues',
            permission: 'transaction.item_usages.read',
          },
        ],
      },
      {
        label: 'Distribusi',
        permissionAny: ['transaction.delivery_orders.read'],
        children: [
          {
            label: 'Surat Jalan / Transfer Antar Gudang',
            to: '/inventory/delivery-orders',
            permission: 'transaction.delivery_orders.read',
          },
        ],
      },
      {
        label: 'Kontrol Stok',
        permissionAny: [
          'inventory.stock_adjustments.read',
          'inventory.stock_opnames.read',
          'maintenance.stock_reconciliation.read',
        ],
        children: [
          {
            label: 'Penyesuaian Stok',
            to: '/inventory/stock-adjustments',
            permission: 'inventory.stock_adjustments.read',
          },
          {
            label: 'Stok Opname',
            to: '/inventory/stock-opnames',
            permission: 'inventory.stock_opnames.read',
          },
          {
            label: 'Rekonsiliasi Stok',
            to: '/maintenance/stock-reconciliation',
            permission: 'maintenance.stock_reconciliation.read',
          },
        ],
      },
    ],
  },
  {
    label: 'Manajemen Aset',
    icon: PackageCheck,
    children: [
      {
        label: 'Ringkasan Aset',
        to: '/assets/overview',
        permission: 'inventory.assets.read',
      },
      {
        label: 'Register Aset',
        permissionAny: [
          'inventory.assets.read',
          'inventory.assets.update',
          'inventory.asset_direct_acquisitions.read',
          'inventory.asset_migrations.read',
        ],
        children: [
          { label: 'Semua Aset', to: '/assets/register', permission: 'inventory.assets.read' },
          {
            label: 'Aset dari Gudang',
            to: '/assets/from-warehouse',
            permission: 'inventory.assets.read',
          },
          {
            label: 'Aset Langsung',
            to: '/assets/direct-acquisitions',
            permission: 'inventory.asset_direct_acquisitions.read',
          },
          {
            label: 'Migrasi / Aset Lama',
            to: '/assets/migrations',
            permission: 'inventory.asset_migrations.read',
          },
        ],
      },
      {
        label: 'Penugasan Aset',
        permissionAny: [
          'inventory.asset_assignments.read',
          'inventory.asset_assignments.create',
          'inventory.asset_assignments.return',
          'inventory.asset_assignments.transfer',
        ],
        children: [
          {
            label: 'Penugasan Aktif',
            to: '/assets/assignments',
            permission: 'inventory.asset_assignments.read',
          },
          {
            label: 'Pengembalian Aset',
            to: '/assets/returns',
            permission: 'inventory.asset_assignments.read',
          },
          {
            label: 'Transfer Penanggung Jawab',
            to: '/assets/transfers',
            permission: 'inventory.asset_assignments.read',
          },
        ],
      },
      {
        label: 'Perawatan Aset',
        to: '/assets/maintenances',
        permission: 'inventory.asset_maintenances.read',
      },
      {
        label: 'Kerusakan & Kehilangan',
        to: '/assets/loss-cases',
        permission: 'inventory.asset_losses.read',
      },
      {
        label: 'Disposal / Penghapusan',
        to: '/assets/disposals',
        permission: 'inventory.asset_disposals.read',
      },
      {
        label: 'Penyusutan',
        to: '/assets/depreciation',
        permission: 'inventory.asset_depreciation.read',
      },
      {
        label: 'Berita Acara',
        to: '/assets/handovers',
        permission: 'inventory.asset_handovers.read',
      },
    ],
  },
  {
    label: 'Pusat Persetujuan',
    to: '/approvals',
    icon: ClipboardCheck,
    permissionAny: [
      'approvals.inbox.read',
      'dashboard.read',
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
  {
    label: 'Laporan',
    to: '/reports',
    icon: FileBarChart,
    permissionAny: [
      'reports.inventory.read',
      'reports.procurement.read',
      'reports.audit.read',
      'reports.inventory_valuation.read',
      'reports.assets.read',
      'reports.asset_valuation.read',
      'reports.responsibilities.read',
      'reports.asset_maintenances.read',
      'inventory.asset_depreciation.read',
    ],
  },
  {
    label: 'Notifikasi',
    to: '/operations/notifications',
    icon: Bell,
    permission: 'operations.notifications.read',
  },
  {
    label: 'Administrasi',
    icon: ShieldCheck,
    superAdminOnly: true,
    children: [
      {
        label: 'Pengguna',
        to: '/administration/users',
        permission: 'auth.users.read',
        superAdminOnly: true,
      },
      {
        label: 'Peran',
        to: '/administration/roles',
        permission: 'auth.roles.read',
        superAdminOnly: true,
      },
      {
        label: 'Izin',
        to: '/administration/permissions',
        permission: 'auth.permissions.read',
        superAdminOnly: true,
      },
      {
        label: 'Log Audit',
        to: '/administration/audit-logs',
        permission: 'auth.activity.audit_logs.read',
        superAdminOnly: true,
      },
      {
        label: 'Riwayat Masuk',
        to: '/administration/login-histories',
        permission: 'auth.activity.login_histories.read',
        superAdminOnly: true,
      },
      {
        label: 'Sesi Aktif',
        to: '/administration/active-sessions',
        permission: 'auth.activity.active_sessions.read',
        superAdminOnly: true,
      },
    ],
  },
  {
    label: 'Pemeliharaan Sistem',
    icon: Settings,
    children: [
      {
        label: 'Rekonsiliasi Biaya',
        to: '/maintenance/cost-reconciliation',
        permission: 'maintenance.cost_reconciliation.read',
      },
      { label: 'Tempat Sampah', to: '/maintenance/recycle-bin', superAdminOnly: true },
    ],
  },
]

export const dashboardHighlights = [
  {
    label: 'Saldo Stok',
    icon: Warehouse,
    to: '/inventory/stocks',
    permission: 'inventory.stocks.read',
  },
  {
    label: 'Permintaan Barang',
    icon: ClipboardCheck,
    to: '/inventory/item-requests',
    permission: 'transaction.item_requests.read',
  },
  {
    label: 'Pengambilan Langsung',
    icon: PackageCheck,
    to: '/inventory/direct-issues',
    permission: 'transaction.item_usages.read',
  },
  {
    label: 'Pesanan Pembelian',
    icon: ShoppingCart,
    to: '/procurement/purchase-orders',
    permission: 'transaction.purchase_orders.read',
  },
  {
    label: 'Penerimaan Barang',
    icon: Boxes,
    to: '/procurement/goods-receipts',
    permission: 'transaction.goods_receipts.read',
  },
  {
    label: 'Pengiriman',
    icon: Truck,
    to: '/inventory/delivery-orders',
    permission: 'transaction.delivery_orders.read',
  },
  {
    label: 'Register Aset',
    icon: Wrench,
    to: '/assets/register',
    permission: 'inventory.assets.read',
  },
  { label: 'Persetujuan', icon: ClipboardCheck, to: '/approvals', permission: 'dashboard.read' },
  {
    label: 'Nilai Persediaan',
    icon: Calculator,
    to: '/inventory/cost-balances',
    permission: 'inventory.cost_balances.read',
  },
  { label: 'Laporan', icon: BarChart3, to: '/reports', permission: 'reports.inventory.read' },
  {
    label: 'Notifikasi',
    icon: Bell,
    to: '/operations/notifications',
    permission: 'operations.notifications.read',
  },
  {
    label: 'Audit',
    icon: Activity,
    to: '/administration/audit-logs',
    permission: 'auth.activity.audit_logs.read',
    superAdminOnly: true,
  },
  {
    label: 'Pengguna',
    icon: Users,
    to: '/administration/users',
    permission: 'auth.users.read',
    superAdminOnly: true,
  },
  {
    label: 'Tempat Sampah',
    icon: FileArchive,
    to: '/maintenance/recycle-bin',
    superAdminOnly: true,
  },
]

// Generated from the permission export supplied with BACKEND(66).
export interface PermissionDefinition {
  code: string
  name: string
  description: string
}

export const permissionDefinitions: PermissionDefinition[] = [
  {
    code: 'operations.attachments.read',
    name: 'Read Attachments',
    description: 'View and download document attachments',
  },
  {
    code: 'operations.attachments.create',
    name: 'Create Attachments',
    description: 'Upload document attachments',
  },
  {
    code: 'operations.attachments.delete',
    name: 'Delete Attachments',
    description: 'Soft delete document attachments',
  },
  {
    code: 'operations.notifications.read',
    name: 'Read Notifications',
    description: 'View operational notifications',
  },
  {
    code: 'operations.notifications.update',
    name: 'Update Notifications',
    description: 'Read or dismiss operational notifications',
  },
  {
    code: 'operations.notifications.run',
    name: 'Run Notification Scan',
    description: 'Run notification scheduler manually',
  },
  {
    code: 'maintenance.stock_reconciliation.read',
    name: 'Read Stock Reconciliation',
    description: 'Inspect stock integrity differences',
  },
  {
    code: 'reports.audit.read',
    name: 'Read Audit Dashboard',
    description: 'View audit and API activity dashboard',
  },
  {
    code: 'inventory.asset_disposals.read',
    name: 'Read Asset Disposals',
    description: 'View asset disposal workflows',
  },
  {
    code: 'inventory.asset_disposals.create',
    name: 'Create Asset Disposals',
    description: 'Create asset disposal request',
  },
  {
    code: 'inventory.asset_disposals.submit',
    name: 'Submit Asset Disposals',
    description: 'Submit asset disposal for approval',
  },
  {
    code: 'inventory.asset_disposals.approve',
    name: 'Approve Asset Disposals',
    description: 'Approve or reject asset disposal',
  },
  {
    code: 'inventory.asset_disposals.complete',
    name: 'Complete Asset Disposals',
    description: 'Complete approved disposal',
  },
  {
    code: 'inventory.asset_losses.read',
    name: 'Read Asset Loss Cases',
    description: 'View asset loss workflows',
  },
  {
    code: 'inventory.asset_losses.create',
    name: 'Create Asset Loss Cases',
    description: 'Report lost asset',
  },
  {
    code: 'inventory.asset_losses.review',
    name: 'Review Asset Loss Cases',
    description: 'Investigate asset loss',
  },
  {
    code: 'inventory.asset_losses.approve',
    name: 'Approve Asset Loss Cases',
    description: 'Approve or reject asset loss',
  },
  {
    code: 'inventory.asset_losses.recover',
    name: 'Recover Lost Assets',
    description: 'Return recovered asset to warehouse',
  },
  {
    code: 'inventory.asset_losses.close',
    name: 'Close Asset Loss Cases',
    description: 'Close approved unrecovered loss',
  },
  {
    code: 'inventory.asset_depreciation.read',
    name: 'Read Asset Depreciation',
    description: 'Calculate and report depreciation',
  },
  {
    code: 'inventory.asset_depreciation.snapshot',
    name: 'Snapshot Asset Depreciation',
    description: 'Create depreciation snapshot',
  },
  {
    code: 'inventory.asset_handovers.read',
    name: 'Read Asset Handovers',
    description: 'View and print handover documents',
  },
  {
    code: 'inventory.asset_handovers.create',
    name: 'Create Asset Handovers',
    description: 'Create handover documents',
  },
  {
    code: 'inventory.asset_handovers.sign',
    name: 'Sign Asset Handovers',
    description: 'Sign handover documents',
  },
  {
    code: 'maintenance.cost_reconciliation.read',
    name: 'Read Cost Reconciliation',
    description:
      'Melihat hasil rekonsiliasi antara saldo stok, saldo biaya, dan pergerakan biaya persediaan.',
  },
  {
    code: 'maintenance.cost_reconciliation.run',
    name: 'Run Cost Reconciliation',
    description:
      'Menjalankan proses rekonsiliasi biaya persediaan untuk mendeteksi perbedaan saldo, nilai, dan pergerakan biaya.',
  },
  {
    code: 'catalog.category_groups.create',
    name: 'Create Category Groups',
    description: 'Membuat data category group baru.',
  },
  {
    code: 'catalog.category_groups.delete',
    name: 'Delete Category Groups',
    description: 'Menghapus atau melakukan soft delete data category group.',
  },
  {
    code: 'catalog.category_groups.read',
    name: 'Read Category Groups',
    description: 'Melihat daftar dan detail category group.',
  },
  {
    code: 'catalog.category_groups.update',
    name: 'Update Category Groups',
    description: 'Mengubah data category group.',
  },
  {
    code: 'dashboard.read',
    name: 'Read Dashboard',
    description: 'Melihat dashboard dan ringkasan data aplikasi.',
  },
  {
    code: 'inventory.stock_adjustments.approve',
    name: 'Approve Stock Adjustments',
    description: 'Menyetujui pengajuan penyesuaian stok.',
  },
  {
    code: 'inventory.stock_adjustments.create',
    name: 'Create Stock Adjustments',
    description: 'Membuat transaksi penyesuaian stok.',
  },
  {
    code: 'inventory.stock_adjustments.read',
    name: 'Read Stock Adjustments',
    description: 'Melihat daftar dan detail penyesuaian stok.',
  },
  {
    code: 'inventory.stock_adjustments.update',
    name: 'Update Stock Adjustments',
    description: 'Mengubah dan memproses transaksi penyesuaian stok.',
  },
  {
    code: 'inventory.stock_opnames.approve',
    name: 'Approve Stock Opnames',
    description: 'Menyetujui dan memproses hasil stock opname.',
  },
  {
    code: 'inventory.stock_opnames.create',
    name: 'Create Stock Opnames',
    description: 'Membuat kegiatan stock opname.',
  },
  {
    code: 'inventory.stock_opnames.read',
    name: 'Read Stock Opnames',
    description: 'Melihat daftar dan detail stock opname.',
  },
  {
    code: 'inventory.stock_opnames.update',
    name: 'Update Stock Opnames',
    description: 'Mengubah dan memproses kegiatan stock opname.',
  },
  {
    code: 'reports.inventory.read',
    name: 'Read Inventory Reports',
    description: 'Melihat laporan stok, mutasi, pemakaian, dan distribusi inventory.',
  },
  {
    code: 'transaction.complaints.create',
    name: 'Create Complaints',
    description: 'Membuat laporan atau komplain transaksi kepada vendor.',
  },
  {
    code: 'transaction.complaints.read',
    name: 'Read Complaints',
    description: 'Melihat daftar dan detail komplain transaksi.',
  },
  {
    code: 'transaction.complaints.update',
    name: 'Update Complaints',
    description: 'Mengubah dan memproses penyelesaian komplain transaksi.',
  },
  {
    code: 'transaction.delivery_orders.create',
    name: 'Create Delivery Orders',
    description: 'Membuat transaksi delivery order.',
  },
  {
    code: 'transaction.delivery_orders.read',
    name: 'Read Delivery Orders',
    description: 'Melihat daftar dan detail delivery order.',
  },
  {
    code: 'transaction.delivery_orders.update',
    name: 'Update Delivery Orders',
    description: 'Mengubah dan memproses transaksi delivery order.',
  },
  {
    code: 'transaction.item_requests.approve',
    name: 'Approve Item Requests',
    description: 'Menyetujui atau menolak permintaan barang.',
  },
  {
    code: 'transaction.item_requests.create',
    name: 'Create Item Requests',
    description: 'Membuat permintaan barang.',
  },
  { code: 'auth.users.read', name: 'Read Users', description: 'Melihat daftar dan detail user' },
  { code: 'auth.users.create', name: 'Create Users', description: 'Membuat user baru' },
  { code: 'auth.users.update', name: 'Update Users', description: 'Mengubah data user' },
  {
    code: 'auth.users.delete',
    name: 'Delete Users',
    description: 'Menghapus atau menonaktifkan user',
  },
  {
    code: 'auth.users.update_status',
    name: 'Update User Status',
    description: 'Mengaktifkan atau menonaktifkan user',
  },
  {
    code: 'auth.users.update_password',
    name: 'Update User Password',
    description: 'Mengubah password user',
  },
  {
    code: 'auth.users.revoke_sessions',
    name: 'Revoke User Sessions',
    description: 'Mencabut semua session user',
  },
  {
    code: 'auth.users.access.read',
    name: 'Read User Access',
    description: 'Melihat akses company, location, dan category group user',
  },
  {
    code: 'auth.users.access.update',
    name: 'Update User Access',
    description: 'Mengubah akses company, location, dan category group user',
  },
  { code: 'auth.users.roles.read', name: 'Read User Roles', description: 'Melihat role user' },
  { code: 'auth.users.roles.update', name: 'Update User Roles', description: 'Mengubah role user' },
  { code: 'auth.roles.read', name: 'Read Roles', description: 'Melihat role' },
  { code: 'auth.roles.create', name: 'Create Roles', description: 'Membuat role' },
  { code: 'auth.roles.update', name: 'Update Roles', description: 'Mengubah role' },
  { code: 'auth.roles.delete', name: 'Delete Roles', description: 'Menghapus role' },
  {
    code: 'auth.roles.permissions.read',
    name: 'Read Role Permissions',
    description: 'Melihat permission role',
  },
  {
    code: 'auth.roles.permissions.update',
    name: 'Update Role Permissions',
    description: 'Mengubah permission role',
  },
  { code: 'auth.permissions.read', name: 'Read Permissions', description: 'Melihat permission' },
  {
    code: 'transaction.item_requests.read',
    name: 'Read Item Requests',
    description: 'Melihat daftar dan detail permintaan barang.',
  },
  {
    code: 'transaction.item_requests.update',
    name: 'Update Item Requests',
    description: 'Mengubah dan memproses permintaan barang.',
  },
  {
    code: 'transaction.item_usages.create',
    name: 'Create Item Usages',
    description: 'Membuat transaksi pemakaian barang.',
  },
  {
    code: 'transaction.item_usages.read',
    name: 'Read Item Usages',
    description: 'Melihat daftar dan detail pemakaian barang.',
  },
  {
    code: 'transaction.item_usages.update',
    name: 'Update Item Usages',
    description: 'Mengubah dan memproses transaksi pemakaian barang.',
  },
  {
    code: 'reports.inventory_valuation.read',
    name: 'Read Inventory Valuation',
    description:
      'Melihat laporan jumlah stok, average unit cost, dan total nilai persediaan berdasarkan context aktif.',
  },
  {
    code: 'reports.asset_valuation.read',
    name: 'Read Asset Valuation',
    description:
      'Melihat laporan acquisition cost, accumulated depreciation, dan net book value aset berdasarkan context aktif.',
  },
  {
    code: 'auth.permissions.create',
    name: 'Create Permissions',
    description: 'Membuat permission',
  },
  {
    code: 'auth.permissions.update',
    name: 'Update Permissions',
    description: 'Mengubah permission',
  },
  {
    code: 'auth.permissions.delete',
    name: 'Delete Permissions',
    description: 'Menghapus permission',
  },
  {
    code: 'auth.activity.audit_logs.read',
    name: 'Read Audit Logs',
    description: 'Melihat audit log aktivitas user',
  },
  {
    code: 'auth.activity.login_histories.read',
    name: 'Read Login Histories',
    description: 'Melihat riwayat login user',
  },
  {
    code: 'auth.activity.active_sessions.read',
    name: 'Read Active Sessions',
    description: 'Melihat session aktif user',
  },
  { code: 'organization.companies.read', name: 'Read Companies', description: 'Melihat company' },
  {
    code: 'organization.companies.create',
    name: 'Create Companies',
    description: 'Membuat company',
  },
  {
    code: 'organization.companies.update',
    name: 'Update Companies',
    description: 'Mengubah company',
  },
  {
    code: 'organization.companies.delete',
    name: 'Delete Companies',
    description: 'Menonaktifkan company',
  },
  {
    code: 'organization.location_types.read',
    name: 'Read Location Types',
    description: 'Melihat tipe lokasi',
  },
  {
    code: 'organization.location_types.create',
    name: 'Create Location Types',
    description: 'Membuat tipe lokasi',
  },
  {
    code: 'organization.location_types.update',
    name: 'Update Location Types',
    description: 'Mengubah tipe lokasi',
  },
  {
    code: 'organization.location_types.delete',
    name: 'Delete Location Types',
    description: 'Menonaktifkan tipe lokasi',
  },
  { code: 'organization.locations.read', name: 'Read Locations', description: 'Melihat lokasi' },
  {
    code: 'organization.locations.create',
    name: 'Create Locations',
    description: 'Membuat lokasi',
  },
  {
    code: 'organization.locations.update',
    name: 'Update Locations',
    description: 'Mengubah lokasi',
  },
  {
    code: 'organization.locations.delete',
    name: 'Delete Locations',
    description: 'Menonaktifkan lokasi',
  },
  { code: 'warehouses.read', name: 'Read Warehouses', description: 'Melihat warehouse' },
  { code: 'warehouses.create', name: 'Create Warehouses', description: 'Membuat warehouse' },
  { code: 'warehouses.update', name: 'Update Warehouses', description: 'Mengubah warehouse' },
  { code: 'warehouses.delete', name: 'Delete Warehouses', description: 'Menonaktifkan warehouse' },
  { code: 'warehouse.warehouses.read', name: 'Read Warehouses', description: 'Melihat warehouse' },
  {
    code: 'warehouse.warehouses.create',
    name: 'Create Warehouses',
    description: 'Membuat warehouse',
  },
  {
    code: 'warehouse.warehouses.update',
    name: 'Update Warehouses',
    description: 'Mengubah warehouse',
  },
  {
    code: 'warehouse.warehouses.delete',
    name: 'Delete Warehouses',
    description: 'Menonaktifkan warehouse',
  },
  { code: 'catalog.uoms.read', name: 'Read UOMs', description: 'Melihat satuan' },
  { code: 'catalog.uoms.create', name: 'Create UOMs', description: 'Membuat satuan' },
  { code: 'catalog.uoms.update', name: 'Update UOMs', description: 'Mengubah satuan' },
  { code: 'catalog.uoms.delete', name: 'Delete UOMs', description: 'Menonaktifkan satuan' },
  { code: 'catalog.categories.read', name: 'Read Categories', description: 'Melihat kategori' },
  { code: 'catalog.categories.create', name: 'Create Categories', description: 'Membuat kategori' },
  {
    code: 'catalog.categories.update',
    name: 'Update Categories',
    description: 'Mengubah kategori',
  },
  {
    code: 'catalog.categories.delete',
    name: 'Delete Categories',
    description: 'Menonaktifkan kategori',
  },
  { code: 'catalog.brands.read', name: 'Read Brands', description: 'Melihat brand' },
  { code: 'catalog.brands.create', name: 'Create Brands', description: 'Membuat brand' },
  { code: 'catalog.brands.update', name: 'Update Brands', description: 'Mengubah brand' },
  { code: 'catalog.brands.delete', name: 'Delete Brands', description: 'Menonaktifkan brand' },
  { code: 'catalog.suppliers.read', name: 'Read Suppliers', description: 'Melihat supplier' },
  { code: 'catalog.suppliers.create', name: 'Create Suppliers', description: 'Membuat supplier' },
  { code: 'catalog.suppliers.update', name: 'Update Suppliers', description: 'Mengubah supplier' },
  {
    code: 'catalog.suppliers.delete',
    name: 'Delete Suppliers',
    description: 'Menonaktifkan supplier',
  },
  { code: 'catalog.items.read', name: 'Read Items', description: 'Melihat item' },
  { code: 'catalog.items.create', name: 'Create Items', description: 'Membuat item' },
  { code: 'catalog.items.update', name: 'Update Items', description: 'Mengubah item' },
  { code: 'catalog.items.delete', name: 'Delete Items', description: 'Menonaktifkan item' },
  {
    code: 'catalog.item_part_numbers.read',
    name: 'Read Item Part Numbers',
    description: 'Melihat part number item',
  },
  {
    code: 'catalog.item_part_numbers.create',
    name: 'Create Item Part Numbers',
    description: 'Membuat part number item',
  },
  {
    code: 'catalog.item_part_numbers.update',
    name: 'Update Item Part Numbers',
    description: 'Mengubah part number item',
  },
  {
    code: 'catalog.item_part_numbers.delete',
    name: 'Delete Item Part Numbers',
    description: 'Menonaktifkan part number item',
  },
  {
    code: 'catalog.item_uom_conversions.read',
    name: 'Read Item UOM Conversions',
    description: 'Melihat konversi satuan item',
  },
  {
    code: 'catalog.item_uom_conversions.create',
    name: 'Create Item UOM Conversions',
    description: 'Membuat konversi satuan item',
  },
  {
    code: 'catalog.item_uom_conversions.update',
    name: 'Update Item UOM Conversions',
    description: 'Mengubah konversi satuan item',
  },
  {
    code: 'catalog.item_uom_conversions.delete',
    name: 'Delete Item UOM Conversions',
    description: 'Menonaktifkan konversi satuan item',
  },
  {
    code: 'catalog.item_suppliers.read',
    name: 'Read Item Suppliers',
    description: 'Melihat supplier item',
  },
  {
    code: 'catalog.item_suppliers.create',
    name: 'Create Item Suppliers',
    description: 'Membuat supplier item',
  },
  {
    code: 'catalog.item_suppliers.update',
    name: 'Update Item Suppliers',
    description: 'Mengubah supplier item',
  },
  {
    code: 'catalog.item_suppliers.delete',
    name: 'Delete Item Suppliers',
    description: 'Menonaktifkan supplier item',
  },
  {
    code: 'transaction.purchase_orders.read',
    name: 'Read Purchase Orders',
    description: 'Melihat purchase order',
  },
  {
    code: 'transaction.purchase_orders.create',
    name: 'Create Purchase Orders',
    description: 'Membuat purchase order',
  },
  {
    code: 'transaction.purchase_orders.send',
    name: 'Send Purchase Orders',
    description: 'Mengirim purchase order',
  },
  {
    code: 'transaction.purchase_orders.update',
    name: 'Update Purchase Orders',
    description: 'Mengubah purchase order',
  },
  {
    code: 'transaction.goods_receipts.read',
    name: 'Read Goods Receipts',
    description: 'Melihat goods receipt',
  },
  {
    code: 'transaction.goods_receipts.create',
    name: 'Create Goods Receipts',
    description: 'Membuat goods receipt',
  },
  {
    code: 'transaction.goods_receipts.update',
    name: 'Update Goods Receipts',
    description: 'Mengubah goods receipt',
  },
  {
    code: 'transaction.goods_receipts.generate_qr',
    name: 'Generate Goods Receipt QR',
    description: 'Generate QR goods receipt',
  },
  {
    code: 'transaction.goods_receipts.scan_to_stock',
    name: 'Scan Goods Receipt To Stock',
    description: 'Scan QR goods receipt ke stock',
  },
  {
    code: 'transaction.goods_receipts.post_qty_to_stock',
    name: 'Post Goods Receipt Qty To Stock',
    description: 'Posting qty goods receipt ke stock',
  },
  {
    code: 'transaction.goods_receipts.post_scanned_to_stock',
    name: 'Post Scanned Goods Receipt To Stock',
    description: 'Posting hasil scan goods receipt ke stock',
  },
  {
    code: 'inventory.stocks.read',
    name: 'Read Inventory Stocks',
    description: 'Melihat stock inventory',
  },
  {
    code: 'inventory.item_units.read',
    name: 'Read Item Units',
    description: 'Melihat unit item/QR',
  },
  {
    code: 'inventory.stock_thresholds.read',
    name: 'Read Stock Thresholds',
    description: 'Melihat minimum stock',
  },
  {
    code: 'inventory.stock_thresholds.create',
    name: 'Create Stock Thresholds',
    description: 'Membuat minimum stock',
  },
  {
    code: 'inventory.stock_thresholds.update',
    name: 'Update Stock Thresholds',
    description: 'Mengubah minimum stock',
  },
  {
    code: 'inventory.stock_thresholds.delete',
    name: 'Delete Stock Thresholds',
    description: 'Menghapus minimum stock',
  },
  {
    code: 'organization.divisions.read',
    name: 'Read divisions',
    description: 'View HRIS-synchronized divisions',
  },
  {
    code: 'organization.employees.read',
    name: 'Read employees',
    description: 'View HRIS-synchronized employees',
  },
  {
    code: 'organization.employees.sync',
    name: 'Sync HRIS organization',
    description: 'Run HRIS division and employee synchronization',
  },
  {
    code: 'organization.responsibilities.read',
    name: 'Read responsibility targets',
    description: 'Search active responsibility targets',
  },
  { code: 'organization.vehicles.read', name: 'Read vehicles', description: 'View vehicles' },
  {
    code: 'organization.vehicles.create',
    name: 'Create vehicles',
    description: 'Create vehicle master data',
  },
  {
    code: 'organization.vehicles.update',
    name: 'Update vehicles',
    description: 'Update vehicle master data',
  },
  {
    code: 'organization.vehicles.delete',
    name: 'Delete vehicles',
    description: 'Deactivate vehicle master data',
  },
  {
    code: 'inventory.assets.read',
    name: 'Read assets',
    description: 'View asset register and asset detail',
  },
  {
    code: 'inventory.assets.update',
    name: 'Update asset profiles',
    description: 'Create or update asset profile',
  },
  {
    code: 'inventory.asset_assignments.read',
    name: 'Read asset assignments',
    description: 'View asset assignment history',
  },
  {
    code: 'inventory.asset_assignments.create',
    name: 'Assign assets',
    description: 'Assign an asset to a responsibility target',
  },
  {
    code: 'inventory.asset_assignments.return',
    name: 'Return assets',
    description: 'Return an asset to warehouse',
  },
  {
    code: 'inventory.asset_assignments.transfer',
    name: 'Transfer assets',
    description: 'Transfer asset responsibility',
  },
  {
    code: 'inventory.asset_maintenances.read',
    name: 'Read asset maintenance',
    description: 'View asset maintenance',
  },
  {
    code: 'inventory.asset_maintenances.create',
    name: 'Create asset maintenance',
    description: 'Create asset maintenance work',
  },
  {
    code: 'inventory.asset_maintenances.update',
    name: 'Update asset maintenance',
    description: 'Start, complete, or cancel maintenance',
  },
  {
    code: 'reports.assets.read',
    name: 'Read asset reports',
    description: 'View asset responsibility reports',
  },
  {
    code: 'reports.responsibilities.read',
    name: 'Read responsibility reports',
    description: 'View item usage by responsibility',
  },
  {
    code: 'reports.asset_maintenances.read',
    name: 'Read asset maintenance reports',
    description: 'View asset maintenance reports',
  },
  {
    code: 'catalog.purchase_prices.create',
    name: 'Create Purchase Prices',
    description: 'Membuat referensi harga pembelian supplier secara manual.',
  },
  {
    code: 'catalog.purchase_prices.read',
    name: 'Read Purchase Prices',
    description: 'Melihat histori harga pembelian supplier.',
  },
  {
    code: 'catalog.purchase_prices.update',
    name: 'Update Purchase Prices',
    description: 'Mengubah referensi harga pembelian manual.',
  },
  {
    code: 'catalog.purchase_prices.delete',
    name: 'Delete Purchase Prices',
    description: 'Menghapus referensi harga pembelian manual.',
  },
  {
    code: 'inventory.cost_balances.read',
    name: 'Read Cost Balances',
    description: 'Melihat saldo nilai persediaan dan average cost.',
  },
  {
    code: 'inventory.cost_movements.read',
    name: 'Read Cost Movements',
    description: 'Melihat histori pergerakan nilai persediaan.',
  },
  {
    code: 'transaction.landed_costs.create',
    name: 'Create Landed Costs',
    description: 'Membuat dokumen landed cost.',
  },
  {
    code: 'transaction.landed_costs.read',
    name: 'Read Landed Costs',
    description: 'Melihat landed cost, receipt, charge, preview, dan allocation.',
  },
  {
    code: 'transaction.landed_costs.update',
    name: 'Update Landed Costs',
    description:
      'Mengubah draft/rejected, menghitung preview, submit, atau cancel sebelum approval.',
  },
  {
    code: 'transaction.landed_costs.delete',
    name: 'Delete Landed Costs',
    description: 'Soft-delete landed cost yang belum diposting.',
  },
  {
    code: 'transaction.landed_costs.approve',
    name: 'Approve Landed Costs',
    description: 'Menyetujui atau menolak landed cost yang sudah disubmit.',
  },
  {
    code: 'transaction.landed_costs.post',
    name: 'Post Landed Costs',
    description: 'Memposting landed cost ke inventory costing dan specific unit cost.',
  },
  {
    code: 'transaction.landed_costs.reverse',
    name: 'Reverse Landed Costs',
    description: 'Membalik landed cost yang sudah diposting jika belum ada cost movement lanjutan.',
  },
]

export const permissionCodes = new Set(permissionDefinitions.map((item) => item.code))

export type PermissionCode = (typeof permissionDefinitions)[number]['code']

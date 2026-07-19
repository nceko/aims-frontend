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
  { label: 'Dashboard', to: '/', icon: Gauge, permission: 'dashboard.read' },
  {
    label: 'Organisasi',
    icon: Building2,
    children: [
      {
        label: 'Company',
        to: '/organization/companies',
        permission: 'organization.companies.read',
      },
      {
        label: 'Tipe Lokasi',
        to: '/organization/location-types',
        permission: 'organization.location_types.read',
      },
      {
        label: 'Location',
        to: '/organization/locations',
        permission: 'organization.locations.read',
      },
      {
        label: 'Warehouse',
        to: '/organization/warehouses',
        permission: 'warehouse.warehouses.read',
      },
      {
        label: 'Division',
        to: '/organization/divisions',
        permission: 'organization.divisions.read',
      },
      {
        label: 'Employee',
        to: '/organization/employees',
        permission: 'organization.employees.read',
      },
      {
        label: 'Responsibility Directory',
        to: '/organization/responsibilities',
        permission: 'organization.responsibilities.read',
      },
      { label: 'Vehicle', to: '/organization/vehicles', permission: 'organization.vehicles.read' },
    ],
  },
  {
    label: 'Katalog',
    icon: Boxes,
    children: [
      {
        label: 'Category Group',
        to: '/catalog/category-groups',
        permission: 'catalog.category_groups.read',
      },
      { label: 'Category', to: '/catalog/categories', permission: 'catalog.categories.read' },
      { label: 'UOM', to: '/catalog/uoms', permission: 'catalog.uoms.read' },
      { label: 'Brand', to: '/catalog/brands', permission: 'catalog.brands.read' },
      { label: 'Item', to: '/catalog/items', permission: 'catalog.items.read' },
      {
        label: 'Part Number',
        to: '/catalog/item-part-numbers',
        permission: 'catalog.item_part_numbers.read',
      },
      {
        label: 'Konversi UOM',
        to: '/catalog/item-uom-conversions',
        permission: 'catalog.item_uom_conversions.read',
      },
      {
        label: 'Supplier Item',
        to: '/catalog/item-suppliers',
        permission: 'catalog.item_suppliers.read',
      },
      { label: 'Supplier', to: '/catalog/suppliers', permission: 'catalog.suppliers.read' },
      {
        label: 'Harga Pembelian',
        to: '/catalog/purchase-prices',
        permission: 'catalog.purchase_prices.read',
      },
    ],
  },
  {
    label: 'Pembelian',
    icon: ShoppingCart,
    children: [
      {
        label: 'Purchase Order',
        to: '/procurement/purchase-orders',
        permission: 'transaction.purchase_orders.read',
      },
      {
        label: 'Penerimaan Barang',
        to: '/procurement/goods-receipts',
        permission: 'transaction.goods_receipts.read',
      },
      {
        label: 'Landed Cost',
        to: '/procurement/landed-costs',
        permission: 'transaction.landed_costs.read',
      },
      {
        label: 'Komplain Vendor',
        to: '/procurement/complaints',
        permission: 'transaction.complaints.read',
      },
    ],
  },
  {
    label: 'Inventory',
    icon: Warehouse,
    children: [
      { label: 'Stock Balance', to: '/inventory/stocks', permission: 'inventory.stocks.read' },
      {
        label: 'Item Unit / QR',
        to: '/inventory/item-units',
        permission: 'inventory.item_units.read',
      },
      {
        label: 'Minimum Stock',
        to: '/inventory/stock-thresholds',
        permission: 'inventory.stock_thresholds.read',
      },
      {
        label: 'Low Stock',
        to: '/inventory/low-stock',
        permission: 'inventory.stock_thresholds.read',
      },
      {
        label: 'Permintaan Barang',
        to: '/inventory/item-requests',
        permission: 'transaction.item_requests.read',
      },
      {
        label: 'Surat Jalan',
        to: '/inventory/delivery-orders',
        permission: 'transaction.delivery_orders.read',
      },
      {
        label: 'Pemakaian Barang',
        to: '/inventory/item-usages',
        permission: 'transaction.item_usages.read',
      },
      {
        label: 'Stock Adjustment',
        to: '/inventory/stock-adjustments',
        permission: 'inventory.stock_adjustments.read',
      },
      {
        label: 'Stock Opname',
        to: '/inventory/stock-opnames',
        permission: 'inventory.stock_opnames.read',
      },
      {
        label: 'Cost Balance',
        to: '/inventory/cost-balances',
        permission: 'inventory.cost_balances.read',
      },
      {
        label: 'Cost Movement',
        to: '/inventory/cost-movements',
        permission: 'inventory.cost_movements.read',
      },
    ],
  },
  {
    label: 'Asset Management',
    icon: PackageCheck,
    children: [
      { label: 'Asset Register', to: '/assets/register', permission: 'inventory.assets.read' },
      {
        label: 'Maintenance',
        to: '/assets/maintenances',
        permission: 'inventory.asset_maintenances.read',
      },
      {
        label: 'Asset Hilang',
        to: '/assets/loss-cases',
        permission: 'inventory.asset_losses.read',
      },
      { label: 'Disposal', to: '/assets/disposals', permission: 'inventory.asset_disposals.read' },
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
    label: 'Approval Center',
    to: '/approvals',
    icon: ClipboardCheck,
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
  {
    label: 'Reports',
    to: '/reports',
    icon: FileBarChart,
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
  {
    label: 'Notifications',
    to: '/operations/notifications',
    icon: Bell,
    permission: 'operations.notifications.read',
  },
  {
    label: 'Administration',
    icon: ShieldCheck,
    superAdminOnly: true,
    children: [
      {
        label: 'Users',
        to: '/administration/users',
        permission: 'auth.users.read',
        superAdminOnly: true,
      },
      {
        label: 'Roles',
        to: '/administration/roles',
        permission: 'auth.roles.read',
        superAdminOnly: true,
      },
      {
        label: 'Permissions',
        to: '/administration/permissions',
        permission: 'auth.permissions.read',
        superAdminOnly: true,
      },
      {
        label: 'Audit Logs',
        to: '/administration/audit-logs',
        permission: 'auth.activity.audit_logs.read',
        superAdminOnly: true,
      },
      {
        label: 'Login History',
        to: '/administration/login-histories',
        permission: 'auth.activity.login_histories.read',
        superAdminOnly: true,
      },
      {
        label: 'Active Sessions',
        to: '/administration/active-sessions',
        permission: 'auth.activity.active_sessions.read',
        superAdminOnly: true,
      },
    ],
  },
  {
    label: 'Maintenance',
    icon: Settings,
    children: [
      {
        label: 'Stock Reconciliation',
        to: '/maintenance/stock-reconciliation',
        permission: 'maintenance.stock_reconciliation.read',
      },
      {
        label: 'Cost Reconciliation',
        to: '/maintenance/cost-reconciliation',
        permission: 'maintenance.cost_reconciliation.read',
      },
      { label: 'Recycle Bin', to: '/maintenance/recycle-bin', superAdminOnly: true },
    ],
  },
]

export const dashboardHighlights = [
  { label: 'Stock', icon: Warehouse, to: '/inventory/stocks', permission: 'inventory.stocks.read' },
  {
    label: 'Purchase Order',
    icon: ShoppingCart,
    to: '/procurement/purchase-orders',
    permission: 'transaction.purchase_orders.read',
  },
  {
    label: 'Penerimaan',
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
  { label: 'Asset', icon: Wrench, to: '/assets/register', permission: 'inventory.assets.read' },
  { label: 'Approval', icon: ClipboardCheck, to: '/approvals', permission: 'dashboard.read' },
  {
    label: 'Costing',
    icon: Calculator,
    to: '/inventory/cost-balances',
    permission: 'inventory.cost_balances.read',
  },
  { label: 'Reports', icon: BarChart3, to: '/reports', permission: 'reports.inventory.read' },
  {
    label: 'Notifications',
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
    label: 'Users',
    icon: Users,
    to: '/administration/users',
    permission: 'auth.users.read',
    superAdminOnly: true,
  },
  { label: 'Recycle Bin', icon: FileArchive, to: '/maintenance/recycle-bin', superAdminOnly: true },
]

import {
  Activity,
  ArchiveRestore,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ClipboardCheck,
  ClipboardList,
  ContactRound,
  FileBarChart,
  Gauge,
  History,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
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
  children?: NavItem[]
}

export const navigation: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: Gauge, permission: 'dashboard.read' },
  {
    label: 'Master Data',
    icon: Building2,
    children: [
      { label: 'Company', to: '/master/companies', permission: 'master.companies.read' },
      { label: 'Location', to: '/master/locations', permission: 'master.locations.read' },
      { label: 'Warehouse', to: '/master/warehouses', permission: 'master.warehouses.read' },
      {
        label: 'Category Group',
        to: '/master/category-groups',
        permission: 'master.category_groups.read',
      },
      { label: 'Category', to: '/master/categories', permission: 'master.categories.read' },
      { label: 'UOM', to: '/master/uoms', permission: 'master.uoms.read' },
      { label: 'Brand', to: '/master/brands', permission: 'master.brands.read' },
      { label: 'Item', to: '/master/items', permission: 'master.items.read' },
      { label: 'Supplier', to: '/master/suppliers', permission: 'master.suppliers.read' },
      { label: 'Division', to: '/master/divisions', permission: 'master.divisions.read' },
      { label: 'Employee', to: '/master/employees', permission: 'master.employees.read' },
      { label: 'Vehicle', to: '/master/vehicles', permission: 'master.vehicles.read' },
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
        label: 'Komplain Vendor',
        to: '/procurement/complaints',
        permission: 'transaction.complaints.read',
      },
    ],
  },
  {
    label: 'Inventory',
    icon: Boxes,
    children: [
      { label: 'Stock Balance', to: '/inventory/stocks', permission: 'inventory.stocks.read' },
      {
        label: 'Item Unit / QR',
        to: '/inventory/item-units',
        permission: 'inventory.item_units.read',
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
      { label: 'Low Stock', to: '/inventory/low-stock', permission: 'inventory.stocks.read' },
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
        permission: 'inventory.asset_loss_cases.read',
      },
      { label: 'Disposal', to: '/assets/disposals', permission: 'inventory.asset_disposals.read' },
    ],
  },
  {
    label: 'Approval Center',
    to: '/approvals',
    icon: ClipboardCheck,
    permission: 'dashboard.read',
  },
  { label: 'Reports', to: '/reports', icon: FileBarChart, permission: 'reports.read' },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  {
    label: 'Administration',
    icon: ShieldCheck,
    children: [
      { label: 'Users', to: '/administration/users', permission: 'iam.users.read' },
      { label: 'Roles', to: '/administration/roles', permission: 'iam.roles.read' },
      {
        label: 'Permissions',
        to: '/administration/permissions',
        permission: 'iam.permissions.read',
      },
      { label: 'Audit Logs', to: '/administration/audit-logs', permission: 'reports.audit.read' },
      {
        label: 'Login History',
        to: '/administration/login-history',
        permission: 'reports.audit.read',
      },
      { label: 'Active Sessions', to: '/administration/sessions', permission: 'iam.users.read' },
    ],
  },
]

export const dashboardHighlights = [
  { label: 'Inventory', icon: Warehouse, to: '/inventory/stocks' },
  { label: 'Purchase Order', icon: ReceiptText, to: '/procurement/purchase-orders' },
  { label: 'Penerimaan', icon: PackageOpen, to: '/procurement/goods-receipts' },
  { label: 'Pengiriman', icon: Truck, to: '/inventory/delivery-orders' },
  { label: 'Asset', icon: Wrench, to: '/assets/register' },
  { label: 'Approval', icon: ClipboardList, to: '/approvals' },
  { label: 'Activity', icon: Activity, to: '/administration/audit-logs' },
  { label: 'Users', icon: Users, to: '/administration/users' },
  { label: 'History', icon: History, to: '/reports' },
  { label: 'Recycle', icon: ArchiveRestore, to: '/system/recycle-bin' },
  { label: 'Settings', icon: Settings, to: '/system/settings' },
  { label: 'Analytics', icon: BarChart3, to: '/reports' },
  { label: 'Configuration', icon: SlidersHorizontal, to: '/system/settings' },
  { label: 'Contacts', icon: ContactRound, to: '/master/employees' },
]

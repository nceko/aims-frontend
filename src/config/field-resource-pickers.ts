import type { FieldResourcePickerSource } from '@/types/resource'

export const fieldResourcePickers: Record<string, FieldResourcePickerSource> = {
  item_id: {
    operationId: 'FindAllItems',
    detailOperationId: 'FindItemByID',
    valueKey: 'item_id',
    labelKeys: ['item_code', 'item_name'],
    title: 'Pilih Item',
    description:
      'Cari item berdasarkan kode, nama, kategori, brand, atau tracking type. Klik dua kali pada baris untuk langsung memilih.',
    searchPlaceholder: 'Cari kode item, nama, kategori, atau brand…',
    columns: [
      { key: 'item_code', label: 'Kode Item', width: '150px' },
      { key: 'item_name', label: 'Nama Item' },
      { key: 'category_name', label: 'Category' },
      { key: 'brand_name', label: 'Brand' },
      { key: 'tracking_type', label: 'Tracking' },
      { key: 'uom_code', label: 'Base UOM', width: '110px' },
      { key: 'is_asset', label: 'Asset', width: '90px' },
    ],
    selectionEffects: {
      uom_id: 'base_uom_id',
    },
    clearFields: ['part_id'],
  },
  po_id: {
    operationId: 'FindEligiblePurchaseOrdersForReceipt',
    detailOperationId: 'FindPurchaseOrderByID',
    valueKey: 'po_id',
    labelKeys: ['po_no', 'supplier_name'],
    title: 'Pilih Purchase Order',
    description:
      'Hanya PO yang sudah difinalisasi, belum selesai diterima, dan masih mempunyai sisa quantity yang ditampilkan.',
    searchPlaceholder: 'Cari nomor PO, supplier, atau warehouse…',
    columns: [
      { key: 'po_no', label: 'Nomor PO', width: '220px' },
      { key: 'supplier_name', label: 'Supplier' },
      { key: 'warehouse_name', label: 'Warehouse' },
      { key: 'expected_date', label: 'Tanggal Diharapkan' },
      { key: 'status', label: 'Status', width: '150px' },
    ],
    selectionEffects: {
      supplier_id: 'supplier_id',
      warehouse_id: 'warehouse_id',
    },
  },
}

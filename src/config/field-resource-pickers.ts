import type { FieldResourcePickerSource } from '@/types/resource'

export const fieldResourcePickers: Record<string, FieldResourcePickerSource> = {
  source_request_id: {
    operationId: 'FindAllItemRequests',
    detailOperationId: 'FindItemRequestByID',
    valueKey: 'request_id',
    labelKeys: ['request_no', 'requester_warehouse'],
    title: 'Pilih Permintaan Barang',
    description:
      'Pilih permintaan yang sudah disetujui dan masih memiliki quantity yang belum dipenuhi.',
    searchPlaceholder: 'Cari nomor permintaan, warehouse, lokasi, atau status…',
    fixedQuery: {
      status: 'APPROVED,STOCK_AVAILABLE,PROCESSING_DELIVERY,PARTIALLY_FULFILLED',
    },
    columns: [
      { key: 'request_no', label: 'Nomor Permintaan', width: '220px' },
      { key: 'requester_warehouse', label: 'Warehouse Peminta' },
      { key: 'requester_location', label: 'Lokasi Peminta' },
      { key: 'priority', label: 'Prioritas', width: '110px' },
      { key: 'needed_date', label: 'Tanggal Dibutuhkan' },
      { key: 'status', label: 'Status', width: '170px' },
    ],
  },
  request_id: {
    operationId: 'FindAllItemRequests',
    detailOperationId: 'FindItemRequestByID',
    valueKey: 'request_id',
    labelKeys: ['request_no', 'requester_warehouse'],
    title: 'Pilih Permintaan untuk Pengiriman',
    description:
      'Pilih permintaan yang sudah disetujui dan masih memiliki quantity yang dapat dikirim.',
    searchPlaceholder: 'Cari nomor permintaan, warehouse, lokasi, atau status…',
    fixedQuery: {
      status: 'APPROVED,STOCK_AVAILABLE,PROCESSING_DELIVERY,PARTIALLY_FULFILLED',
    },
    columns: [
      { key: 'request_no', label: 'Nomor Permintaan', width: '220px' },
      { key: 'requester_warehouse', label: 'Warehouse Tujuan' },
      { key: 'requester_location', label: 'Lokasi Tujuan' },
      { key: 'priority', label: 'Prioritas', width: '110px' },
      { key: 'needed_date', label: 'Tanggal Dibutuhkan' },
      { key: 'status', label: 'Status', width: '170px' },
    ],
  },
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

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

const [
  modules,
  schemaFields,
  workbench,
  fieldOptions,
  approvalLines,
  requestUsageLines,
  deliveryOrderLines,
  fieldResourcePickers,
  fieldGrouping,
  apiMetadata,
  navigation,
  purchaseOrderLines,
  router,
  appModal,
] = await Promise.all([
  read('../src/config/modules.ts'),
  read('../src/components/data/SchemaFields.vue'),
  read('../src/modules/resource/ResourceWorkbenchView.vue'),
  read('../src/config/field-options.ts'),
  read('../src/components/data/ItemRequestApprovalLinesField.vue'),
  read('../src/components/data/ItemUsageRequestLinesField.vue'),
  read('../src/components/data/DeliveryOrderRequestLinesField.vue'),
  read('../src/config/field-resource-pickers.ts'),
  read('../src/utils/field-grouping.ts'),
  read('../src/generated/api-metadata.json'),
  read('../src/config/navigation.ts'),
  read('../src/components/data/PurchaseOrderLinesField.vue'),
  read('../src/router/index.ts'),
  read('../src/components/ui/AppModal.vue'),
])

test('permintaan menampilkan gudang pemohon dan gudang pemenuh dari respons API', () => {
  assert.match(modules, /'requester_warehouse'/)
  assert.match(modules, /'fulfillment_warehouse'/)
  assert.doesNotMatch(modules, /requester_warehouse_name/)
})

test('cek stok memilih gudang sumber dan persetujuan hanya tersedia setelah cek stok', () => {
  assert.match(schemaFields, /Gudang Sumber Stok/)
  assert.match(modules, /statuses: \['STOCK_AVAILABLE', 'STOCK_UNAVAILABLE'\]/)
  assert.match(approvalLines, /ID baris dikunci oleh sistem/)
  assert.doesNotMatch(approvalLines, /Tambah Lines/)
})

test('pengeluaran berdasarkan permintaan hanya menerima permintaan lokal', () => {
  assert.match(schemaFields, /requesterWarehouseID === fulfillmentWarehouseID/)
  assert.match(workbench, /Proses permintaan ini melalui Surat Jalan \/ Delivery Order/)
  assert.match(workbench, /warehouse_id: fulfillmentWarehouseID/)
  assert.match(requestUsageLines, /referensi permintaan dikunci/)
  assert.doesNotMatch(requestUsageLines, /Baris Permintaan/)
})

test('jenis penggunaan memiliki pilihan resmi pada kontrak frontend', () => {
  for (const value of [
    'OPERATIONAL',
    'MAINTENANCE',
    'REPAIR',
    'INTERNAL_USE',
    'PROJECT',
    'OTHER',
  ]) {
    assert.match(fieldOptions, new RegExp(value))
  }
  assert.match(apiMetadata, /"usage_type"/)
  assert.match(apiMetadata, /"INTERNAL_USE"/)
})

test('surat jalan hanya memakai permintaan disetujui dan memuat rute gudang otomatis', () => {
  const requestPicker = fieldResourcePickers.match(
    /request_id:\s*\{[\s\S]*?\n  \},\n  item_id:/,
  )?.[0]
  assert.ok(requestPicker)
  assert.match(requestPicker, /allowedStatuses: \['APPROVED'/)
  assert.doesNotMatch(requestPicker, /STOCK_AVAILABLE/)
  assert.match(requestPicker, /from_warehouse_id: 'fulfillment_warehouse_id'/)
  assert.match(requestPicker, /to_warehouse_id: 'requester_warehouse_id'/)
  assert.match(workbench, /deliveryOrderReadyStatuses/)
  assert.match(workbench, /from_warehouse_id', 'to_warehouse_id'/)
})

test('baris teknis surat jalan disembunyikan dan diganti informasi barang', () => {
  assert.match(schemaFields, /DeliveryOrderRequestLinesField/)
  assert.match(deliveryOrderLines, /Sisa Dapat Dikirim/)
  assert.match(deliveryOrderLines, /Lot \/ Batch hanya digunakan/)
  assert.doesNotMatch(deliveryOrderLines, /Referensi Baris Permintaan/)
  assert.doesNotMatch(deliveryOrderLines, /Tambah Lines/)
  assert.match(fieldGrouping, /Permintaan & Rute Gudang/)
  assert.match(fieldGrouping, /Barang yang Dikirim/)
})

test('menu permintaan mengikuti jalur pemenuhan tanpa panel panduan', () => {
  assert.match(navigation, /label: 'Permintaan & Pemenuhan'/)
  assert.match(navigation, /label: 'Pemakaian Lokal'/)
  assert.match(navigation, /label: 'Pengiriman Antar Lokasi'/)
  assert.doesNotMatch(navigation, /label: 'Distribusi'/)
  assert.doesNotMatch(workbench, /request-flow-guide/)
  assert.doesNotMatch(workbench, /Pilih alur berdasarkan hasil cek stok/)
})

test('frontend menahan duplikasi resource berdasarkan ID sebagai pengaman', () => {
  assert.match(workbench, /function uniqueRowsByResourceID/)
  assert.match(workbench, /rows\.value = uniqueRowsByResourceID\(loadedRows\)/)
})

test('PO mendukung pengadaan pusat dan pembelian daerah dari permintaan yang sama', () => {
  const purchaseRequestPicker = fieldResourcePickers.match(
    /source_request_id:\s*\{[\s\S]*?\n  \},\n  request_id:/,
  )?.[0]
  assert.ok(purchaseRequestPicker)
  assert.match(
    purchaseRequestPicker,
    /allowedStatuses: \['APPROVED', 'WAITING_PURCHASE', 'PARTIALLY_FULFILLED'\]/,
  )
  assert.match(workbench, /asNumber\(line\.procurement_shortage_qty\)/)
  assert.match(workbench, /remaining - asNumber\(line\.available_stock_qty\)/)
  assert.match(workbench, /ordered_qty: shortage/)
  assert.match(
    workbench,
    /Quantity awal mengikuti saran kekurangan pengadaan dan tetap dapat dinaikkan/,
  )
  assert.match(workbench, /resolveCommonDefaultSupplier/)
  assert.match(workbench, /dateInputValue\(request\.needed_date, fallbackExpectedDate\)/)
  assert.match(purchaseOrderLines, /Saran pengadaan/)
  assert.match(purchaseOrderLines, /boleh ditambah/)
  assert.match(workbench, /_remaining_qty: remaining/)
  assert.match(workbench, /_central_shortage_qty: shortage/)
  assert.match(workbench, /_requester_warehouse_id: request\.requester_warehouse_id/)
  assert.match(workbench, /_fulfillment_warehouse_id: request\.fulfillment_warehouse_id/)
  assert.match(workbench, /Mode pembelian daerah aktif/)
  assert.match(workbench, /memenuhi permintaan tanpa Surat Jalan dari pusat/)
  assert.match(workbench, /Mode pengadaan pusat aktif/)
  assert.match(workbench, /Tunggu Pengadaan terlebih dahulu/)
  assert.match(modules, /'procurement_route'/)
  assert.match(fieldOptions, /procurement_route: 'Jalur Pengadaan'/)
})

test('PO tanpa sumber permintaan menyembunyikan kolom request dan UOM mengikuti item', () => {
  assert.match(schemaFields, /:source-request-id="contextModel\.source_request_id"/)
  assert.match(purchaseOrderLines, /const showRequestLineColumn = computed/)
  assert.match(purchaseOrderLines, /<th v-if="showRequestLineColumn">Baris Permintaan<\/th>/)
  assert.match(purchaseOrderLines, /path: '\/api\/v1\/items\/\{id\}\/uoms\/options'/)
  assert.match(purchaseOrderLines, /:source-override="itemUOMSource"/)
  assert.match(purchaseOrderLines, /:disabled="disabled \|\| !line\.item_id"/)
  assert.doesNotMatch(workbench, /Mode pengadaan stok mandiri/)
  assert.match(workbench, /lines: lines\.filter\(\(raw\) => !asRecord\(raw\)\.request_line_id\)/)
})

test('rute lokal tidak ditawarkan sebagai transfer dan gudang turunan tetap terbaca saat dikunci', async () => {
  const requestPicker = fieldResourcePickers.match(
    /request_id:\s*\{[\s\S]*?\n  \},\n  item_id:/,
  )?.[0]
  assert.ok(requestPicker)
  assert.match(requestPicker, /requesterWarehouseID !== fulfillmentWarehouseID/)
  assert.match(requestPicker, /from_warehouse_name: 'fulfillment_warehouse'/)
  assert.match(requestPicker, /to_warehouse_name: 'requester_warehouse'/)
  assert.match(workbench, /from_warehouse_name: request\.fulfillment_warehouse/)
  assert.match(workbench, /to_warehouse_name: request\.requester_warehouse/)
  assert.match(workbench, /warehouse_name: request\.fulfillment_warehouse/)
  assert.match(schemaFields, /dikunci agar stok keluar dari gudang yang benar/)
})

test('pengeluaran barang memakai workspace scan dan posting seperti penerimaan barang', async () => {
  const router = await read('../src/router/index.ts')
  const scanView = await read('../src/modules/workflow/ItemUsageScanView.vue')
  assert.match(modules, /label: 'Proses Scan & Posting'/)
  assert.match(modules, /handler: 'item-usage-scan'/)
  assert.match(router, /item-usages\/:id\/scan/)
  assert.match(scanView, /PreviewItemUsageScan/)
  assert.match(scanView, /PostItemUsage/)
  assert.match(scanView, /BrowserQRCodeReader/)
  assert.match(scanView, /qtys:/)
  assert.match(scanView, /serials:/)
})

test('pemakaian lokal dan pengambilan langsung memiliki daftar terpisah berdasarkan issue mode', () => {
  assert.match(router, /module\.key === 'item-usages'[\s\S]*issue_mode: 'REQUEST'/)
  assert.match(router, /inventory\/direct-issues[\s\S]*listQuery: \{ issue_mode: 'DIRECT' \}/)
  assert.match(workbench, /\.\.\.routeListQuery\.value/)
})

test('form modal autofocuses the first editable field while scan pages keep their own focus', () => {
  assert.match(appModal, /function focusFirstField/)
  assert.match(appModal, /data-autofocus/)
  assert.match(appModal, /input:not\(\[type="hidden"\]\):not\(\[disabled\]\):not\(\[readonly\]\)/)
  assert.match(appModal, /field\?\.focus\(\{ preventScroll: true \}\)/)
})

test('PO defaults and line editor follow request, lot, UOM conversion, and reciprocal pricing rules', () => {
  assert.match(modules, /createOptionDefaults: \{ warehouse_id: 'WH-PST' \}/)
  assert.match(workbench, /expected_date: localDateInputValue\(\), currency_code: 'IDR'/)
  assert.match(workbench, /tracking_type: String\(line\.tracking_type \?\? ''\)\.toUpperCase\(\)/)
  assert.match(purchaseOrderLines, /const showLotColumn = computed/)
  assert.match(
    purchaseOrderLines,
    /String\(line\.tracking_type \?\? ''\)\.toUpperCase\(\) === 'LOT'/,
  )
  assert.match(purchaseOrderLines, /FindItemUOMConversionsByItemID/)
  assert.match(purchaseOrderLines, /function conversionFactors/)
  assert.match(purchaseOrderLines, /Harga Total/)
  assert.match(purchaseOrderLines, /function updateUnitPrice/)
  assert.match(purchaseOrderLines, /function updateTotalPrice/)
})

# AIMS Frontend Procurement Alignment V34

## Tujuan

Merapikan pemilih data besar, lifecycle Purchase Order, serta lifecycle Penerimaan Barang agar dokumen selesai tetap tersedia sebagai histori tetapi tidak dapat diedit.

## Pemilih data besar

### Item

Field `item_id` menggunakan modal tabel dari `GET /api/v1/items`, bukan dropdown options. Pengguna dapat mencari, klik tombol **Pilih**, atau double-click baris. Base UOM otomatis mengisi `uom_id`.

### Purchase Order pada Penerimaan Barang

Field `po_id` menggunakan modal tabel dari `GET /api/v1/purchase-orders/eligible-for-receipt`. Hanya PO dengan sisa quantity yang ditampilkan. Supplier dan warehouse mengikuti PO terpilih.

## Lifecycle dokumen

PO dan Goods Receipt mempunyai tab proses aktif, histori, dan semua. PO hanya dapat diedit saat `DRAFT`. Goods Receipt tidak dapat diedit setelah `CHECKED`.

Goods Receipt berstatus `POSTED_TO_STOCK` hanya dapat dilihat. Reverse tersedia sebagai tindakan koreksi pada halaman detail dan membutuhkan permission khusus.

## Validasi

- TypeScript/vue-tsc: PASS
- Prettier: PASS
- Automated tests: 50 PASS
- Production build perlu dijalankan setelah `npm ci` pada environment Linux karena dependency optional Rollup pada ZIP awal berasal dari Darwin.

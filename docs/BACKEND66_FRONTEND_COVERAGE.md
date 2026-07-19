# Cakupan Frontend AIMS terhadap BACKEND(66)

Dokumen ini mencatat hasil penyelarasan source frontend dengan Swagger dan route pada `BACKEND(66).zip`, serta daftar permission yang diberikan pengguna.

## Ringkasan

| Pemeriksaan                                                | Hasil |
| ---------------------------------------------------------- | ----: |
| Swagger operation yang dimuat ke metadata frontend         |   319 |
| Operation ID yang direferensikan langsung oleh workflow UI |   268 |
| Resource/module frontend                                   |    48 |
| Permission pada daftar pengguna                            |   181 |
| Permission terintegrasi ke menu/guard/aksi                 |   176 |
| Permission backend yang belum dapat dipakai                |     1 |
| Permission legacy duplikat yang sengaja tidak dipakai      |     4 |

Metadata Swagger yang digunakan frontend berada di `src/generated/api-metadata.json`. Daftar permission hasil normalisasi berada di `src/generated/permissions.ts`, sedangkan audit lengkap tersedia di `docs/PERMISSION_COVERAGE_BACKEND66.csv`.

## Modul yang tersedia

| Area           | Cakupan frontend                                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication | Company selection, initial login, location/category-group context, switch context, refresh token, `/auth/me`, logout                                                       |
| Dashboard      | Summary, asset summary, pending actions, stock per lokasi, movement trend, audit/API activity                                                                              |
| Organization   | Company, location type, location, warehouse, division, employee, responsibility directory, vehicle                                                                         |
| Catalog        | Category group dan assignment category, category, UOM, brand, supplier, item, part number, UOM conversion, item supplier, purchase price                                   |
| Procurement    | Purchase Order, Goods Receipt, vendor complaint, Landed Cost                                                                                                               |
| Inventory      | Stock balance, QR/unit lookup dan history, minimum stock, low stock, item request, delivery order, item usage, stock adjustment, stock opname, cost balance, cost movement |
| Asset          | Asset register/profile, assignment/return/transfer, maintenance, loss, disposal, depreciation, handover/sign/print                                                         |
| Reports        | Inventory, movement, low stock, in-transit, delivery, usage, valuation, asset responsibility, maintenance, depreciation; export CSV/XLSX sesuai backend                    |
| Administration | User, context access, category-group access, roles, permissions, audit log, login history, active session                                                                  |
| Operations     | Notification, attachment upload/download/delete                                                                                                                            |
| Maintenance    | Stock reconciliation, cost reconciliation, restore soft-deleted data berdasarkan ID                                                                                        |

## Pola implementasi

Frontend memakai **schema-driven workbench**. Struktur request form diambil dari Swagger metadata sehingga field create, update, dan workflow action mengikuti request DTO backend. Dropdown ID memakai endpoint `/options` dan dependent query bila tersedia.

Fitur khusus yang tidak cukup ditangani form generik juga sudah ditambahkan:

- Goods Receipt memuat otomatis sisa baris dari Purchase Order terpilih.
- Delivery Order memuat otomatis sisa baris dari Item Request terpilih.
- Item Unit memiliki pencarian langsung berdasarkan QR dan riwayat QR.
- Asset action dilakukan dari Asset Register: assign, return, transfer, maintenance, loss, disposal, dan berita acara.
- Category Group mendukung tambah atau mengganti assignment category.
- User mendukung pengaturan akses context, category group, role, password, status, dan pencabutan session.
- Handover dapat dibuka dalam format cetak HTML dengan authorization melalui Axios.
- Attachment tersedia pada entitas transaksi/aset yang didukung backend.

## Catatan penting dari backend

### 1. Purchase Order masih memiliki tahap teknis `SENT_TO_VENDOR`

`BACKEND(66)` masih mewajibkan endpoint `POST /api/v1/purchase-orders/{id}/send` sebelum Goods Receipt dapat dibuat. Karena proses bisnis Anda tidak benar-benar mengirim PO dari aplikasi ke supplier, frontend menampilkan aksi tersebut sebagai **Finalisasi PO**, bukan “Kirim ke Supplier”. Endpoint backend yang dipanggil tetap `/send` sampai state machine backend diperbaiki.

### 2. Sinkronisasi HRIS belum aktif

Permission `organization.employees.sync` tersedia, tetapi route sinkronisasi employee/division pada backend masih dinonaktifkan. Frontend tidak menampilkan tombol sync agar tidak menghasilkan request 404.

### 3. Permission warehouse duplikat

Daftar permission memiliki dua keluarga:

- `warehouses.*` — legacy;
- `warehouse.warehouses.*` — digunakan route backend aktif.

Frontend menggunakan `warehouse.warehouses.*`. Empat permission `warehouses.*` tetap dicatat dalam CSV tetapi tidak dipakai.

### 4. Recycle Bin tidak memiliki endpoint list universal

Backend menyediakan endpoint restore per entitas tetapi tidak menyediakan daftar semua data soft-deleted. Halaman Recycle Bin karena itu meminta jenis entitas dan ID yang akan direstore.

### 5. Pengujian live

Format, TypeScript, test statis, mapping Swagger, dan production build dijalankan di environment pembuatan. Full E2E terhadap server production dan data nyata belum dijalankan dari environment ini; lakukan UAT dengan akun testing setelah deploy ke staging.

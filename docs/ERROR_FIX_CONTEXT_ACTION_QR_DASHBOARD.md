# Laporan Perbaikan Error Context, Action Menu, Dashboard, dan Generate QR

## Ringkasan

Project `FRONTEND(15).zip` diperbaiki pada empat area utama:

1. Pesan error saat membuka modal ganti context meskipun pilihan category group terlihat.
2. Popover aksi titik tiga terpotong atau tampil di bawah baris DataTable.
3. Bagian `Audit & API Activity` pada dashboard.
4. Request `Generate QR` dan action Goods Receipt lain yang diblokir CORS.

## 1. Error Category Group pada Ganti Context

### Penyebab

Halaman master Category Group dan dropdown context memakai endpoint berbeda:

- Master: `GET /api/v1/category-groups`
- Dropdown: `GET /api/v1/category-groups/options`

Frontend mengirim query berikut ke endpoint dropdown:

```http
GET /api/v1/category-groups/options?company_id=1&limit=100
```

Berdasarkan metadata Swagger frontend, `/category-groups/options` hanya mendukung `company_id` dan `search`. Parameter `limit` hanya didukung oleh `/locations/options`. Backend merespons `500` terhadap request yang salah tersebut.

Pilihan tetap terlihat karena data location dan category group dari response login masih tersimpan di cache Pinia/localStorage. Jadi tampilan berisi data lama, sedangkan proses refresh endpoint gagal dan memunculkan pesan error.

### Perbaikan

- `locations/options` tetap menerima `company_id` dan `limit=100`.
- `category-groups/options` hanya menerima `company_id`.
- Modal ganti context memakai pilihan dari response login/cache terlebih dahulu.
- API options hanya dipanggil jika cache context benar-benar kosong.

File:

```text
src/modules/auth/auth.api.ts
src/components/layout/ContextSwitcherModal.vue
```

## 2. Generate QR dan Check Goods Receipt Diblokir CORS

### Penyebab

Frontend sebelumnya otomatis menambahkan header berikut untuk semua POST/PUT/PATCH/DELETE:

```http
Idempotency-Key: <uuid>
```

Konfigurasi CORS backend belum mengizinkan `Idempotency-Key` di `Access-Control-Allow-Headers`. Browser menghentikan request pada tahap preflight OPTIONS dengan pesan:

```text
Request header field idempotency-key is not allowed by Access-Control-Allow-Headers
```

Akibatnya endpoint berikut belum sempat diproses backend:

```http
POST /api/v1/goods-receipts/{id}/generate-qr
POST /api/v1/goods-receipts/{id}/check
```

### Perbaikan

Header idempotency sekarang bersifat opt-in dan default-nya dimatikan:

```env
VITE_ENABLE_IDEMPOTENCY_HEADER=false
```

Header wajib yang tetap dikirim pada endpoint protected:

```http
Authorization: Bearer <access_token>
Accept: application/json
Content-Type: application/json   # bila terdapat body JSON
```

`Idempotency-Key` hanya boleh diaktifkan setelah backend CORS memasukkan header tersebut ke daftar allowed headers.

File:

```text
src/services/http.ts
src/config/runtime.ts
env.d.ts
.env.example
scripts/docker-entrypoint.sh
scripts/deploy-podman.sh
```

## 3. Menu Aksi Titik Tiga Terpotong

### Penyebab

Popover action sebelumnya dirender di dalam cell DataTable. DataTable memiliki scroll internal dan `overflow: auto`, sehingga popover dapat:

- terpotong oleh area tabel;
- muncul di bawah baris lain;
- tidak dapat diklik ketika berada dekat footer tabel.

### Perbaikan

Popover dipindahkan ke `<body>` memakai Vue `<Teleport>`. Posisi dihitung dari tombol yang diklik menggunakan `getBoundingClientRect()`.

Perilaku baru:

- membuka ke bawah bila ruang tersedia;
- otomatis membuka ke atas bila dekat bagian bawah layar;
- tidak terpotong DataTable;
- z-index `5000`;
- menutup saat klik di luar, menekan Escape, scroll, atau resize.

File:

```text
src/modules/resource/ResourceWorkbenchView.vue
src/assets/styles/main.scss
```

## 4. Audit & API Activity Dihapus dari Dashboard

Frontend tidak lagi:

- memanggil `GET /api/v1/dashboard/audit` dari dashboard;
- menyimpan state audit dashboard;
- menampilkan card `Audit & API Activity`.

Audit log administrasi tetap tersedia melalui menu Administration sesuai permission yang berlaku.

File:

```text
src/modules/dashboard/DashboardView.vue
src/modules/dashboard/dashboard.api.ts
```

## 5. Penanganan Network/CORS Error

Pesan `Network Error` sekarang diterjemahkan menjadi:

```text
Koneksi ke backend gagal atau request diblokir oleh kebijakan CORS.
```

File:

```text
src/utils/api.ts
```

## Validasi

```text
Prettier check       PASS
Automated tests      29 PASS
TypeScript strict    PASS
Production build     PASS
Preview HTTP         200 OK
npm                  11.6.0
```

Catatan: build validasi dijalankan pada environment Node 22 dengan engine strict dimatikan karena runner tidak menyediakan Node 24. Project tetap dikunci untuk Node `>=24.0.0` dan npm `11.6.0`, sesuai konfigurasi production project.

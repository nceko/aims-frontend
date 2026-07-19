# Laporan Perapihan API Header dan Action DataTable AIMS

Sumber project: `FRONTEND(14).zip`

## Ringkasan

Perbaikan dilakukan pada dua area:

1. seluruh komunikasi API dipusatkan melalui satu Axios client dan satu request policy;
2. tombol action DataTable dibuat horizontal dalam satu baris dan kolom action dipertahankan di sisi kanan.

## 1. Kebijakan header API

File baru:

```text
src/services/request-policy.ts
```

File utama:

```text
src/services/http.ts
src/services/api-client.ts
```

### Endpoint public

Endpoint berikut tidak membawa Bearer token:

```http
GET  /public/v1/companies
POST /api/v1/auth/login
POST /api/v1/auth/refresh
```

Header dasar:

```http
Accept: application/json
Content-Type: application/json    # hanya request yang memiliki JSON body
```

### Initial context

Sesudah login awal, `access_token` awal disimpan sebagai initial token. Request berikut memakai token tersebut:

```http
Authorization: Bearer <initial_access_token>
```

Contoh:

```http
POST /api/v1/auth/switch-context
```

### Endpoint protected

Semua endpoint `/api/v1/*` selain login dan refresh wajib memiliki:

```http
Authorization: Bearer <access_token>
Accept: application/json
```

Frontend sekarang membatalkan request sebelum dikirim apabila endpoint protected tidak memiliki access token atau initial token. Error lokalnya:

```text
AUTH_TOKEN_MISSING
```

Company, location, dan category group tidak dikirim sebagai custom header. Context tersebut dibaca backend dari claim access token aktif.

### JSON request

Untuk body object biasa:

```http
Content-Type: application/json
```

### Upload attachment

Untuk `FormData`, frontend sengaja tidak menulis `Content-Type` secara manual. Browser akan menghasilkan:

```http
Content-Type: multipart/form-data; boundary=<generated-boundary>
```

Hal ini mencegah upload rusak karena boundary tidak tersedia.

### Download dan export

Download memakai `responseType: blob` dan `Accept` sesuai file:

```http
Accept: application/octet-stream
Accept: text/csv
Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

Dokumen HTML memakai:

```http
Accept: text/html
```

### Idempotency

Setiap request protected yang mengubah data menggunakan:

```http
Idempotency-Key: <uuid>
```

Diterapkan pada:

```text
POST
PUT
PATCH
DELETE
```

Endpoint auth dikecualikan. Key yang sama tetap digunakan ketika request diulang setelah refresh token, sehingga request bisnis tidak berubah menjadi transaksi baru ketika retry.

### Refresh token

Ketika endpoint protected mengembalikan `401`:

1. hanya satu request refresh berjalan;
2. request lain menunggu hasil refresh yang sama;
3. access token dan refresh token dirotasi;
4. request awal diulang menggunakan access token baru;
5. `Idempotency-Key` request awal tidak berubah;
6. bila refresh gagal, session dibersihkan dan user diarahkan ke login.

## 2. Seluruh request menggunakan API client terpusat

Request berikut tidak lagi memanggil Axios secara langsung dari komponen:

- upload attachment;
- download attachment;
- export laporan CSV/XLSX;
- membuka dokumen HTML;
- operation executor mode raw.

Semua sekarang melewati:

```text
src/services/api-client.ts
    ↓
src/services/http.ts
    ↓
request interceptor
```

Dengan demikian Authorization, Content-Type, refresh token, dan Idempotency-Key berlaku konsisten.

## 3. Action DataTable horizontal

Sebelumnya `.row-actions` mewarisi:

```css
flex-wrap: wrap;
```

Ketika kolom action sempit, tombol Detail, Edit, Hapus, dan menu tambahan turun ke bawah.

Sekarang:

```css
.row-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  white-space: nowrap;
}
```

Kolom action sekarang:

- memiliki lebar tetap `176px`;
- tombol tetap dalam satu baris;
- menempel di sisi kanan ketika tabel digulir horizontal;
- mempunyai background khusus light/dark agar tidak transparan;
- action tambahan tetap dapat dibuka melalui tombol titik tiga.

## 4. File yang diubah

```text
src/services/request-policy.ts
src/services/http.ts
src/services/api-client.ts
src/services/api-operations.ts
src/components/data/DocumentAttachments.vue
src/modules/resource/ResourceWorkbenchView.vue
src/modules/reports/ReportsView.vue
src/assets/styles/main.scss
tests/project.test.mjs
README.md
```

## 5. Hasil validasi

```text
Prettier check       PASS
TypeScript strict    PASS
Automated tests      26 PASS
Production build     PASS
Preview HTTP         200 OK
npm                   11.6.0
```

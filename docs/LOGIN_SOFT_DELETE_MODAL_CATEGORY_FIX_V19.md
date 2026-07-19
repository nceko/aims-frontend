# AIMS Frontend V19 — Login NIB, Soft Delete, Modal Stack, dan Category Group

## Ringkasan

Perbaikan ini diterapkan langsung pada project `FRONTEND(18).zip`.

## 1. Login Email atau NIB

Field identitas sebelumnya memakai `type="email"`. Browser menjalankan validasi HTML bawaan dan menolak NIB seperti `101359` karena tidak memiliki karakter `@`.

Perbaikan:

- field diubah menjadi `type="text"`;
- nama field dan payload tetap `identity`;
- backend tetap menerima satu nilai yang dapat berupa email atau NIB;
- autofill username/password tetap didukung;
- validasi wajib isi tetap aktif.

Request login tetap:

```json
{
  "company_id": 1,
  "identity": "101359",
  "password": "********"
}
```

## 2. Soft Delete tanpa dialog browser

`window.confirm()` dihapus dari resource dan attachment.

Sekarang aplikasi menggunakan modal AIMS yang menjelaskan bahwa:

- data mengikuti soft delete backend;
- data tidak langsung dihapus permanen;
- data dapat dipulihkan melalui Recycle Bin bila endpoint restore tersedia.

Setelah sukses, halaman menampilkan notifikasi bahwa data dipindahkan ke Recycle Bin.

## 3. Nested modal tampil di atas modal awal

`AppModal` mendapat properti `layer`.

Urutan layer:

- detail modal: layer 1;
- modal action/form dari detail: layer 2;
- modal konfirmasi: layer 3;
- konfirmasi attachment di dalam detail: layer 4.

Dengan begitu tombol seperti **Tambah Kategori** atau **Atur Ulang Kategori** pada detail Category Group membuka modal baru di atas detail, bukan di belakangnya.

## 4. Category Group lebih mudah dibaca

Array `categories` tidak lagi dirender sebagai kartu besar satu per satu.

Sekarang digunakan tampilan ringkas:

- tabel dengan header sticky;
- kolom Kode, Nama Kategori, Deskripsi, dan Status;
- pencarian kode/nama/deskripsi;
- pagination 10 kategori per halaman;
- area scroll internal maksimal sekitar 390 px;
- kompatibel dengan light/dark mode dan mobile.

Data kategori dihapus dari bagian detail umum agar tidak tampil dua kali.

## File utama yang diperbarui

```text
src/modules/auth/LoginView.vue
src/components/ui/AppInput.vue
src/components/ui/AppModal.vue
src/components/ui/AppConfirmDialog.vue
src/components/data/CategoryGroupCategories.vue
src/components/data/DocumentAttachments.vue
src/modules/resource/ResourceWorkbenchView.vue
src/assets/styles/main.scss
tests/project.test.mjs
```

## Validasi

```text
Prettier check       PASS
TypeScript strict    PASS
Automated tests      36 PASS
Production build     PASS
Preview HTTP         200 OK
npm                  11.6.0
```

Project tetap mengunci environment deployment ke Node.js `>=24.0.0` dan npm `11.6.0` melalui `package.json` dan `.npmrc`.

# Laporan Perbaikan Topbar, Tema, Context, dan Profil AIMS

Tanggal: 19 Juli 2026

## Ringkasan

Project `FRONTEND(10).zip` telah diperbaiki langsung untuk menambahkan pengaturan tema, pergantian context dari topbar, dan halaman profil yang aman serta lebih rapi.

## 1. Toggle tema Light dan Dark

### Perubahan

- Menambahkan tombol tema di topbar.
- Ikon bulan ditampilkan pada tema light untuk berpindah ke dark.
- Ikon matahari ditampilkan pada tema dark untuk kembali ke light.
- Preferensi disimpan pada `localStorage` dengan key `aims.theme`.
- Tema pertama mengikuti preferensi sistem operasi ketika belum pernah dipilih.
- Tema diterapkan sejak aplikasi dimulai, termasuk halaman login.
- Seluruh komponen utama memperoleh tampilan dark mode:
  - topbar dan sidebar;
  - card dan dashboard metric;
  - tabel dan pagination;
  - input dan Select2;
  - modal;
  - profile dropdown;
  - report dan approval;
  - halaman profil.

### File

- `src/stores/ui.store.ts`
- `src/main.ts`
- `src/components/layout/AppTopbar.vue`
- `src/assets/styles/main.scss`

## 2. Ganti Context dari Topbar

### Perubahan

- Menambahkan tombol `Context aktif` pada topbar.
- Tombol menampilkan location dan category group aktif.
- Menambahkan modal context yang memakai komponen Select2 AIMS.
- User dapat memilih:
  - location;
  - category group.
- Global super admin yang sedang berada pada lokasi pusat juga dapat mengganti company.
- Setelah context berhasil diubah, aplikasi kembali ke dashboard agar seluruh data dimuat ulang menggunakan context baru.
- Refresh token lama dikirim melalui `current_refresh_token` ketika context diganti agar rotasi session backend berjalan benar.

### API

- `GET /public/v1/companies`
- `GET /api/v1/locations/options?company_id={id}`
- `GET /api/v1/category-groups/options?company_id={id}`
- `POST /api/v1/auth/switch-context`

### File

- `src/components/layout/ContextSwitcherModal.vue`
- `src/components/layout/AppTopbar.vue`
- `src/modules/auth/auth.api.ts`
- `src/modules/auth/auth.store.ts`
- `src/types/auth.ts`

## 3. Dropdown Profil Topbar

Dropdown profil sekarang berisi:

- ringkasan nama dan email/company;
- `Profil Saya`;
- `Ganti Context`;
- `Keluar`.

Tampilan dibuat lebih terstruktur dan aksi logout diberi pemisah visual.

## 4. Halaman Profil Dirapikan

### Sebelumnya

Halaman profil memakai `StructuredData` untuk menampilkan seluruh object `auth.user`. Karena response login dan switch context sebelumnya digabung langsung ke object user, field teknis seperti `access_token`, `refresh_token`, `token_type`, dan `expires_in` dapat ikut terlihat.

### Sekarang

Halaman profil hanya menampilkan data yang relevan:

- nama pengguna;
- email bila tersedia;
- user ID;
- status akun;
- role;
- jumlah permission;
- company aktif;
- location aktif;
- category group aktif;
- status context.

Daftar permission disembunyikan secara default dan dapat dibuka saat dibutuhkan.

## 5. Sanitasi Data Profil

Ditambahkan fungsi whitelist `safeProfile()` pada auth store. Hanya field profil yang diizinkan yang disimpan ke state dan session cache.

Field token tidak pernah dimasukkan ke `auth.user`:

- `access_token`;
- `refresh_token`;
- `token_type`;
- `expires_in`.

Cache lama yang mungkin masih berisi token juga dibersihkan saat `restoreSession()` dijalankan dan disimpan ulang menggunakan profil yang sudah disanitasi.

## 6. Responsive

- Pada layar desktop, topbar menampilkan ringkasan context aktif.
- Pada layar yang lebih sempit, tombol context berubah menjadi ikon agar topbar tidak penuh.
- Profile grid berubah menjadi satu kolom pada tablet/mobile.
- Modal context dan ringkasan profil responsif untuk layar kecil.

## 7. Automated Test Baru

Test ditambahkan untuk memastikan:

- tombol theme tersedia;
- pilihan theme tersimpan;
- CSS dark theme tersedia;
- context switch tersedia di topbar;
- context modal menggunakan Select2;
- profil tidak memakai `StructuredData` untuk object user;
- access token dan refresh token tidak dirender pada ProfileView;
- auth store memakai sanitasi profil.

## 8. Hasil Validasi

Validasi dijalankan menggunakan:

- Node.js `24.14.0`;
- npm `11.6.0`.

Hasil:

| Pemeriksaan       | Hasil   |
| ----------------- | ------- |
| Prettier          | PASS    |
| TypeScript strict | PASS    |
| Automated test    | 13 PASS |
| Production build  | PASS    |
| Preview HTTP      | 200 OK  |

## File Inti yang Ditambahkan/Diubah

- `src/components/layout/ContextSwitcherModal.vue` — baru
- `src/components/layout/AppTopbar.vue`
- `src/modules/profile/ProfileView.vue`
- `src/modules/auth/auth.api.ts`
- `src/modules/auth/auth.store.ts`
- `src/stores/ui.store.ts`
- `src/types/auth.ts`
- `src/main.ts`
- `src/assets/styles/main.scss`
- `tests/project.test.mjs`

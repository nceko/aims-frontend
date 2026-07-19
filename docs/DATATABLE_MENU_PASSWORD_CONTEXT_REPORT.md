# Laporan Perbaikan AIMS Frontend

Sumber project: `FRONTEND(11).zip`

## Ringkasan

Project diperbarui pada empat area utama:

1. seluruh tabel aplikasi dipusatkan ke komponen DataTable reusable;
2. setiap user dapat memilih menu sidebar atau menu horizontal di bawah topbar;
3. halaman dan modal ganti password ditambahkan;
4. switch context tidak lagi menyediakan pergantian company.

## 1. AIMS DataTable

Komponen baru:

```text
src/components/data/AppDataTable.vue
```

Fitur yang tersedia:

- pencarian data;
- sorting per kolom;
- pemilihan jumlah baris 10/25/50/100;
- pagination;
- column visibility;
- refresh data;
- loading skeleton;
- empty state;
- responsive horizontal scroll;
- slot untuk status dan action row;
- kompatibel dengan light/dark theme.

Implementasi:

- `ResourceWorkbenchView.vue` menggunakan mode server-side untuk search dan pagination API;
- `ReportsView.vue` menggunakan DataTable untuk pencarian, sorting, pagination, dan column visibility pada hasil laporan;
- tidak ada elemen `<table>` lain di halaman aplikasi di luar komponen DataTable.

Catatan: sorting pada resource server-side dilakukan terhadap data halaman yang sudah dimuat. Query sorting global belum dipaksakan ke backend karena parameter sorting setiap endpoint belum seragam.

## 2. Preferensi posisi menu per user

Pilihan:

- `sidebar`;
- `horizontal` di bawah topbar.

Preferensi disimpan menggunakan key per user:

```text
aims.menu-layout.{user_id}
```

Default tetap `sidebar` karena AIMS mempunyai banyak kelompok modul dan submenu. User dapat mengubahnya melalui:

- tombol layout di topbar;
- menu profil;
- halaman `Profil Saya` → `Tampilan Menu`.

Komponen baru:

```text
src/components/layout/AppHorizontalNav.vue
```

Perilaku mobile:

- horizontal navigation disembunyikan;
- hamburger tetap membuka sidebar mobile;
- pilihan user tidak hilang dan digunakan kembali pada desktop.

## 3. Ganti password

Komponen baru:

```text
src/components/layout/ChangePasswordModal.vue
```

Akses tersedia melalui:

- dropdown user di topbar;
- halaman `Profil Saya` → `Keamanan Akun`.

Validasi frontend:

- minimal 8 karakter;
- password dan konfirmasi harus sama;
- tombol submit terkunci ketika form belum valid;
- setelah berhasil, token lokal dibersihkan dan user diarahkan ke login;
- login menampilkan notifikasi bahwa password berhasil diganti.

Endpoint backend yang digunakan:

```http
PUT /api/v1/users/{user_id}/password
```

Body:

```json
{
  "password": "password-baru"
}
```

Backend mendeskripsikan endpoint ini sebagai perubahan password user sekaligus revoke seluruh session.

### Catatan backend penting

Endpoint yang tersedia pada BACKEND(66) adalah endpoint user-management dan menggunakan permission `auth.users.update_password`. Untuk self-service password yang aman bagi seluruh regular user, backend sebaiknya menambahkan endpoint khusus, misalnya:

```http
PUT /api/v1/auth/change-password
```

Dengan body:

```json
{
  "current_password": "password-lama",
  "new_password": "password-baru"
}
```

Frontend saat ini memanggil endpoint yang memang sudah tersedia menggunakan `user_id` milik session sendiri. Apabila middleware backend tetap mewajibkan permission admin, regular user akan menerima HTTP 403 sampai endpoint self-service ditambahkan atau aturan backend diperbaiki. Jangan memberikan permission admin `auth.users.update_password` kepada seluruh user karena endpoint tersebut juga dapat menargetkan user lain.

## 4. Switch context tanpa ganti company

Modal context sekarang hanya memiliki:

- Location;
- Category Group.

Company hanya ditampilkan sebagai informasi terkunci. Tidak ada lagi:

- dropdown company;
- load daftar company pada modal context;
- `company_id` dalam request switch context;
- dependent reload karena pergantian company.

Request final:

```json
{
  "location_id": 2,
  "category_group_id": 2,
  "current_refresh_token": "..."
}
```

Untuk berpindah company, user harus logout lalu login kembali dan memilih company pada halaman login.

## Saran desain menu

Untuk AIMS, sidebar sebaiknya menjadi default karena jumlah modul besar dan struktur submenu dalam. Horizontal menu lebih baik dijadikan preferensi opsional untuk user yang:

- memakai monitor lebar;
- sering berpindah modul;
- membutuhkan area kerja tabel lebih luas.

Saran lanjutan:

1. pertahankan maksimal 7–9 kelompok menu utama;
2. kelompokkan transaksi berdasarkan proses bisnis, bukan nama tabel database;
3. gunakan `Approval Center` sebagai satu pintu approval;
4. simpan menu profil, context, tema, layout, password, dan logout di topbar, bukan sidebar;
5. tambahkan menu favorit/pinned pada fase berikutnya untuk user yang hanya memakai 3–5 halaman secara rutin;
6. pada horizontal layout, hindari menampilkan semua submenu sekaligus—gunakan dropdown seperti implementasi sekarang.

## File utama yang diubah

```text
src/components/data/AppDataTable.vue
src/components/layout/AppHorizontalNav.vue
src/components/layout/AppTopbar.vue
src/components/layout/ChangePasswordModal.vue
src/components/layout/ContextSwitcherModal.vue
src/layouts/AppLayout.vue
src/modules/auth/auth.api.ts
src/modules/auth/auth.store.ts
src/modules/auth/LoginView.vue
src/modules/profile/ProfileView.vue
src/modules/reports/ReportsView.vue
src/modules/resource/ResourceWorkbenchView.vue
src/stores/ui.store.ts
src/types/auth.ts
src/assets/styles/main.scss
tests/project.test.mjs
```

## Validasi

Validasi dilakukan dengan npm 11.6.0 melalui Corepack:

```text
Prettier check      PASS
TypeScript strict   PASS
Automated tests     17 PASS
Production build    PASS
Preview HTTP        200 OK
```

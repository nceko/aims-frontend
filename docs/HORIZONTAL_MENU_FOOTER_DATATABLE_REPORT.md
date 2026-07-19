# Laporan Perbaikan Menu Horizontal, Footer, dan DataTable

## 1. Child menu horizontal

Penyebab child menu tidak terlihat adalah container menu horizontal menggunakan `overflow-x: auto`. Elemen dropdown yang berposisi absolut ikut terpotong oleh area scroll tersebut.

Perbaikan:

- Container menu memakai `overflow: visible`.
- Menu utama dapat membungkus ke baris berikutnya dengan `flex-wrap: wrap`.
- Z-index dropdown dinaikkan.
- Dropdown pada tiga kelompok menu terakhir membuka dari sisi kanan agar tidak keluar viewport.
- Child menu tetap dibuka dengan klik dan dapat ditutup menggunakan Escape atau klik di luar menu.

## 2. Footer permanen

Workspace aplikasi sekarang memakai layout flex setinggi viewport (`100dvh`) dan tidak menggulir seluruh halaman. Area yang menggulir adalah konten utama, sedangkan topbar, menu horizontal, dan footer tetap terlihat.

Footer menampilkan:

- AIMS — Aset & Inventory Management System.
- Copyright PT Baraka Sarana Tama dan tahun berjalan otomatis.
- Versi aplikasi yang dibaca dari `package.json`.

## 3. Semua kolom DataTable aktif saat modul dibuka

Setiap perubahan modul atau struktur kolom akan menginisialisasi seluruh kolom sebagai aktif. Pilihan menyembunyikan kolom tetap berlaku selama user masih berada pada struktur kolom yang sama.

## 4. Scroll internal DataTable

Halaman resource menggunakan tinggi area kerja yang tersedia. DataTable menjadi flex container dengan:

- Toolbar tetap di atas.
- Footer/pagination tetap di bawah.
- Hanya area data yang dapat digulir vertikal dan horizontal.
- Header kolom memakai `position: sticky`, sehingga tetap terlihat ketika baris digulir ke bawah.
- Header dan isi bergerak bersama ketika digulir horizontal supaya posisi kolom tetap sejajar.
- Tabel tidak lagi memperlebar atau menambah tinggi halaman utama.

## File yang diperbarui

- `src/components/data/AppDataTable.vue`
- `src/components/layout/AppHorizontalNav.vue` (perilaku existing dipertahankan)
- `src/layouts/AppLayout.vue`
- `src/modules/resource/ResourceWorkbenchView.vue`
- `src/assets/styles/main.scss`
- `tests/project.test.mjs`

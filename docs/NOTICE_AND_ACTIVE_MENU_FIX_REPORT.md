# AIMS Frontend — Notice Auto Dismiss & Active Menu Fix

## Ringkasan

Perbaikan diterapkan pada project `FRONTEND(17).zip` untuk menyelesaikan dua masalah:

1. Notifikasi sukses seperti `2 QR baru berhasil dibuat` atau `Supplier berhasil diperbarui` tetap tampil setelah berpindah modul.
2. Menu `Dashboard` tetap terlihat aktif ketika user sedang membuka modul lain, misalnya `Landed Cost`.

## Penyebab

### Notifikasi menetap

Semua halaman resource memakai komponen yang sama, yaitu `ResourceWorkbenchView.vue`. Ketika berpindah dari satu resource ke resource lain, Vue mempertahankan instance komponen dan hanya mengganti prop `moduleKey`. State `success` dan `error` sebelumnya tidak dibersihkan, sehingga pesan dari modul lama ikut tampil di modul baru.

### Dashboard tetap aktif

`RouterLink` memakai active matching yang bersifat inklusif. Karena path Dashboard adalah `/`, path tersebut dianggap sebagai prefix dari hampir semua route. Akibatnya class `router-link-active` tetap diberikan kepada Dashboard pada route seperti `/procurement/landed-costs`.

## Perbaikan

### 1. Auto dismiss notifikasi

- Notifikasi sukses otomatis hilang setelah **5 detik**.
- Notifikasi error otomatis hilang setelah **8 detik**.
- Timer lama dibatalkan ketika pesan baru muncul agar tidak terjadi race condition.
- Timer dibersihkan ketika komponen dilepas.

### 2. Hapus notifikasi ketika berpindah modul

Saat `moduleKey` berubah, frontend sekarang langsung:

- membersihkan pesan sukses dan error;
- menutup action popover;
- menutup modal detail, form, dan QR;
- mereset halaman dan pencarian;
- memuat data modul baru.

Dengan demikian pesan dari Penerimaan Barang tidak akan muncul lagi pada Landed Cost, Supplier, Item, atau modul lain.

### 3. Tombol tutup manual

Notifikasi sekarang memiliki tombol `×`, sehingga user dapat menutup pesan tanpa menunggu timer.

### 4. Active menu berdasarkan route aktual

Sidebar dan menu horizontal sekarang memakai pemeriksaan route sendiri:

- `/` hanya aktif jika route benar-benar `/`;
- route lain aktif jika sama persis atau merupakan child route yang sah;
- parent group ikut aktif ketika salah satu child sedang dibuka;
- group yang memiliki child aktif otomatis dibuka.

Contoh:

- `/procurement/landed-costs` → `Pembelian` dan `Landed Cost` aktif;
- `/catalog/items` → `Katalog` dan `Item` aktif;
- `/` → hanya `Dashboard` aktif.

## File yang diperbarui

- `src/modules/resource/ResourceWorkbenchView.vue`
- `src/components/layout/AppSidebar.vue`
- `src/components/layout/AppHorizontalNav.vue`
- `src/assets/styles/main.scss`
- `tests/project.test.mjs`

## Hasil validasi

- Prettier check: PASS
- TypeScript strict check: PASS
- Automated tests: 32 PASS
- Production build: PASS
- Preview HTTP: 200 OK
- npm: 11.6.0

## Catatan

Perubahan ini hanya menyentuh frontend. Tidak ada endpoint, tabel, atau konfigurasi backend yang diubah.

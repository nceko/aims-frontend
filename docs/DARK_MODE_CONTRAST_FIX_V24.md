# Dark Mode Contrast Fix V24

## Perbaikan
Menyesuaikan kontras teks dan background pada mode gelap, khususnya pada modal detail dan panel lampiran.

### Yang diperbaiki
- `detail-field` tidak lagi memakai background putih terang pada dark mode.
- teks isi (`dd`) sekarang memakai `var(--aims-text)` agar lebih terbaca.
- label kecil (`dt`) dan informasi sekunder memakai `var(--aims-muted)`.
- `structured-array` mengikuti warna gelap yang konsisten.
- area `attachments-panel` dan input file upload kini memakai warna gelap yang senada.
- tombol file selector pada input file ikut disesuaikan agar tidak terlalu kontras.
- heading dan teks terkait `related-data-table` diperjelas.

## File yang diubah
- `src/assets/styles/main.scss`

## Dampak visual
Perbaikan ini berlaku untuk seluruh tampilan detail yang memakai pola:
- `StructuredData`
- `detail-grid`
- `structured-array`
- `attachments-panel`
- `related-data-table`

Jadi tidak hanya pada Penerimaan Barang, tetapi juga modal detail lain yang memakai komponen yang sama.

# Laporan Implementasi Select2 AIMS

## Ringkasan

Seluruh dropdown pada frontend AIMS telah dipusatkan ke satu komponen Select2 berbasis Vue di:

```text
src/components/ui/AppSelect.vue
```

Implementasi ini dibuat native Vue agar tidak menambahkan ketergantungan jQuery ke aplikasi Vue 3, tetapi tetap memberikan perilaku Select2 yang dibutuhkan: searchable dropdown, multi-select, clear selection, keyboard navigation, loading state, dan dropdown overlay yang aman digunakan di dalam modal.

## Perubahan Utama

### 1. AppSelect menjadi Select2 global

Komponen `AppSelect.vue` sekarang menyediakan:

- Pencarian pilihan.
- Single select.
- Multiple select.
- Clear selection.
- Loading state.
- Disabled state.
- Placeholder.
- Empty result message.
- Keyboard navigation:
  - `Arrow Up` dan `Arrow Down`.
  - `Enter` untuk memilih.
  - `Escape` untuk menutup.
  - `Backspace` untuk menghapus pilihan terakhir pada multi-select.
- Dropdown menggunakan `Teleport to="body"` sehingga tidak terpotong oleh modal atau container dengan `overflow`.
- Posisi dropdown otomatis berpindah ke atas apabila ruang di bawah tidak cukup.
- Native `<select>` tetap dipertahankan secara tersembunyi untuk kompatibilitas `FormData`, atribut `name`, dan login browser autofill.

### 2. Login dan pemilihan context

Dropdown berikut sekarang menggunakan Select2:

- Company.
- Location.
- Category Group.

Perbaikan login sebelumnya tetap dipertahankan:

- Nilai company tetap masuk ke `FormData`.
- Browser autofill tetap dapat dibaca.
- Payload login tetap memakai `identity` sesuai BACKEND(66).

### 3. Form API dinamis

File:

```text
src/components/data/ApiOptionField.vue
```

Dropdown dinamis dari endpoint backend sekarang menggunakan `AppSelect`, termasuk:

- Dropdown master data.
- Dependent dropdown.
- Enum/status dropdown.
- Multiple selection.
- Loading ketika data option sedang diambil.

### 4. Pagination table

Dropdown jumlah baris pada:

```text
src/modules/resource/ResourceWorkbenchView.vue
```

juga sudah menggunakan Select2 dengan pilihan:

- 10 baris.
- 25 baris.
- 50 baris.
- 100 baris.

### 5. Styling

Tema Select2 disesuaikan dengan branding AIMS:

- Merah utama `#FF0013`.
- Biru korporat `#003461`.
- Focus ring merah.
- Selected option merah lembut.
- Hover option biru lembut.
- Responsive mobile.
- Z-index aman untuk modal.

Styling berada di:

```text
src/assets/styles/main.scss
```

## Pemeriksaan Cakupan

Pencarian source menunjukkan native `<select>` hanya tersisa di dalam `AppSelect.vue` sebagai kontrol tersembunyi untuk form compatibility. Tidak ada halaman lain yang membuat dropdown native secara langsung.

## Hasil Validasi

```text
TypeScript strict check : PASS
Automated tests         : 10 PASS
Production build        : PASS
Prettier check          : PASS
```

## Catatan Teknis

Implementasi ini tidak memakai plugin jQuery Select2. Alasannya, AIMS menggunakan Vue 3 dan komponen native Vue lebih aman terhadap masalah lifecycle, re-render, memory leak, dan konflik DOM yang sering muncul ketika plugin jQuery memodifikasi DOM milik Vue.

Dari sisi pengguna, fitur yang diberikan setara dengan kebutuhan Select2 untuk aplikasi ini, tetapi tetap mengikuti arsitektur Vue yang bersih dan mudah dipelihara.

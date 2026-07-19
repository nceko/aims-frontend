# Laporan Perbaikan Login AIMS

## Masalah

Tombol **Masuk** terlihat tetapi tidak dapat diklik karena kondisi `disabled` membaca state Vue:

```vue
:disabled="!form.companyId || !form.email || !form.password"
```

Pada browser tertentu, terutama ketika autofill/password manager aktif, nilai dapat terlihat sudah terisi di layar tetapi event input belum memperbarui `v-model`. Company yang dimuat secara asynchronous juga dapat terlihat terpilih oleh browser sementara `form.companyId` masih kosong.

## Perbaikan

1. Tombol login tidak lagi dinonaktifkan berdasarkan state field. Tombol hanya terkunci ketika request login sedang diproses melalui `auth.loading`.
2. Semua field login diberi atribut `name` agar dapat dibaca menggunakan `FormData`.
3. Nilai aktual dari DOM dibaca ulang saat form disubmit untuk menangani browser autofill.
4. `AppInput` menyinkronkan nilai pada event `input` dan `change`.
5. `AppSelect` menyinkronkan nilai pada event `input` dan `change`.
6. Jika user hanya memiliki satu company, company tersebut dipilih otomatis setelah daftar company selesai dimuat.
7. Validasi eksplisit ditambahkan sebelum API login dipanggil.
8. Perbaikan yang sama diterapkan pada form pemilihan location dan category group.

## File yang Diubah

- `src/modules/auth/LoginView.vue`
- `src/components/ui/AppInput.vue`
- `src/components/ui/AppSelect.vue`
- `tests/project.test.mjs`

## Perilaku Setelah Perbaikan

- Tombol **Masuk** selalu dapat ditekan saat tidak sedang loading.
- Field kosong tetap ditahan oleh validasi native `required` dan validasi aplikasi.
- Autofill Chrome, Safari, dan password manager tetap terbaca saat submit.
- Double submit dicegah karena tombol otomatis disabled saat `auth.loading` aktif.

## Hasil Validasi

Perbaikan sudah diverifikasi menggunakan npm 11.6.0:

```text
Prettier format check : PASS
TypeScript check      : PASS
Automated tests       : 7 PASS
Production build      : PASS
```

Build production berhasil menggunakan Vite 7.3.6.

# Laporan Perbaikan Login AIMS V2

## Penyebab utama

1. Endpoint public company dari BACKEND(66) mengembalikan primary key sebagai `id_company`, sedangkan frontend hanya membaca `company_id` atau `id`. Akibatnya label company terlihat, tetapi nilai `<option>` kosong dan validasi selalu gagal.
2. Request login BACKEND(66) mewajibkan field `identity`, tetapi frontend mengirim `email`.
3. Handler login membaca `event.currentTarget` setelah `await nextTick()`. Pada event browser, `currentTarget` dapat menjadi `null` setelah melewati batas async sehingga `FormData` tidak membaca field dengan konsisten.

## Perbaikan

- Menambahkan dukungan `id_company` pada tipe dan normalisasi company API.
- Mengubah kontrak login menjadi `{ company_id, identity, password }`.
- Mengubah field UI menjadi `Email / NIB` dengan `name="identity"`.
- Membaca `event.currentTarget` dan `FormData` sebelum operasi asynchronous.
- Mempertahankan dukungan browser autofill.
- Menambahkan regression test untuk struktur response company, request login, dan urutan pembacaan form.

## File yang diubah

- `src/types/auth.ts`
- `src/modules/auth/auth.api.ts`
- `src/modules/auth/auth.store.ts`
- `src/modules/auth/LoginView.vue`
- `tests/project.test.mjs`

## Konfigurasi API

`.env` saat ini masih menggunakan `VITE_API_BASE_URL=http://localhost:8080`. Gunakan ini bila backend berjalan lokal. Untuk backend server, ubah ke `https://api.appbarsartama.id` lalu restart Vite.

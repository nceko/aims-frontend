# AIMS V21 — Perbaikan ID Internal untuk View, Edit, dan Soft Delete

## Gejala

Pada halaman Company, tombol Detail, Edit, dan Hapus menghasilkan pesan:

`Parameter path id belum tersedia.`

Daftar Company tetap dapat dimuat karena endpoint list tidak membutuhkan path ID.

## Akar masalah

Response backend Company menggunakan field primary key `id_company`, sedangkan konfigurasi frontend hanya mencari `company_id` atau `id`.

Versi sebelumnya juga hanya mempunyai fallback untuk field yang berakhiran `_id`, sehingga pola `id_company` tidak pernah ditemukan. ID memang sengaja disembunyikan dari tabel dan modal, tetapi object row tetap membawanya. Yang gagal adalah resolver path action.

## Perbaikan

1. Menambahkan resolver ID terpusat di `src/utils/resource-id.ts`.
2. Resolver mendukung pola `id`, `company_id`, `id_company`, UUID, GUID, dan kandidat ID per modul.
3. Path parameter memakai field exact terlebih dahulu, lalu alias kebalikan `xxx_id` ↔ `id_xxx`, kemudian primary key resource.
4. Konfigurasi Company diperbarui menjadi `['id_company', 'company_id', 'id']`.
5. Konfigurasi Audit Log dan Active Session juga diselaraskan dengan field ID response backend.
6. ID tetap tidak ditampilkan kepada user, tetapi tetap digunakan untuk Detail, Edit, Delete, restore, attachment, dan workflow API.

## Hasil

- Detail Company: `GET /api/v1/companies/{id}` memakai nilai `id_company`.
- Edit Company: `PUT /api/v1/companies/{id}` memakai nilai `id_company`.
- Soft delete Company: `DELETE /api/v1/companies/{id}` memakai nilai `id_company`.
- Pesan `Parameter path id belum tersedia` tidak lagi muncul untuk Company.

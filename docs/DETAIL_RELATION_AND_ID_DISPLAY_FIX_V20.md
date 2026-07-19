# AIMS Frontend V20 — Detail Relation & ID Display

## Ringkasan

Perubahan ini menyamakan tampilan seluruh data relasi/array pada modal detail dengan pola tabel ringkas yang sebelumnya hanya dipakai oleh **Category Group**. Selain itu, ID teknis tidak lagi ditampilkan kepada user, tetapi tetap dipakai oleh frontend untuk route, payload, action, relasi, dan request API.

## 1. Tabel relasi generik untuk seluruh modul

Komponen baru:

```text
src/components/data/RelatedDataTable.vue
```

Komponen tersebut otomatis dipakai untuk:

- Category pada Category Group;
- Part Number pada Item;
- Konversi UOM pada Item;
- Supplier Item;
- Riwayat Unit;
- Riwayat Assignment Asset;
- Penyusutan Asset;
- Akses User;
- Category Group User;
- Role User;
- Permission Role;
- semua array/collection lain yang muncul pada response detail.

Fitur tabel relasi:

- pencarian;
- pagination 10 data per halaman;
- sticky header;
- scroll internal vertikal dan horizontal;
- light/dark theme;
- status badge;
- empty state;
- seluruh kolom bermakna ditampilkan;
- ID dan metadata teknis disembunyikan.

## 2. ID teknis tidak ditampilkan

Field berikut tidak lagi tampil pada modal detail dan tabel relasi:

```text
id
*_id
*_ids
id_*
*_uuid
*_guid
company/location/location_type/pemilik yang berupa angka
created_by
updated_by
deleted_by
deleted_at
path
lft
rgt
depth
lock_version
```

Contoh sebelum:

```text
Location      1
Company       3
Tipe Lokasi   1
Pemilik       1
Nama Location PUSAT KAROSERI
Nama Company  BARAKA KAROSERI
Nama Tipe Lokasi PUSAT
```

Contoh sesudah:

```text
Location      PUSAT KAROSERI
Company       BARAKA KAROSERI
Tipe Lokasi   PUSAT
Kode Location PSTKRS
Kode Company  BK
```

## 3. ID tetap dipakai oleh aplikasi

Perubahan ini hanya pada lapisan tampilan. ID masih digunakan untuk:

- `rowId()`;
- path parameter API;
- create/update payload;
- soft delete/restore;
- edit/detail action;
- dependent dropdown;
- assignment dan relation mapping;
- permission dan workflow action.

Tidak ada field ID yang dihapus dari response, state, atau payload.

## 4. Label dibuat lebih mudah dipahami

Field response seperti:

```text
company_name
location_name
location_type_name
category_group_name
supplier_name
warehouse_name
```

ditampilkan menjadi:

```text
Company
Location
Tipe Lokasi
Category Group
Supplier
Warehouse
```

Bukan lagi `Nama Company`, `Nama Location`, atau angka ID referensi.

## 5. DataTable utama ikut disaring

Kolom ID yang muncul dari konfigurasi atau hasil inferensi tidak lagi ditampilkan pada tabel utama. ID tetap tersimpan pada object row dan tetap digunakan untuk action.

## File yang ditambahkan

```text
src/components/data/RelatedDataTable.vue
src/utils/detail-display.ts
```

## File yang diperbarui

```text
src/components/data/StructuredData.vue
src/modules/resource/ResourceWorkbenchView.vue
src/assets/styles/main.scss
tests/project.test.mjs
```

## Catatan backend

Hasil terbaik diperoleh apabila endpoint detail mengembalikan pasangan field berikut:

```text
company_id + company_name
location_type_id + location_type_name
supplier_id + supplier_name
warehouse_id + warehouse_name
```

Frontend menyembunyikan ID dan menampilkan nilai nama/kode. Apabila backend hanya mengembalikan ID tanpa nama/kode, ID tetap tidak ditampilkan agar user tidak melihat angka referensi yang tidak bermakna.

# AIMS Frontend V22 — Options Endpoint Tanpa Limit

## Perubahan

Semua request ke endpoint yang memiliki segmen `/options` sekarang tidak pernah mengirim parameter pagination seperti:

- `limit`
- `per_page`
- `page_size`
- `pageSize`
- `take`
- `skip`
- `offset`

Filter yang memang diperlukan tetap dipertahankan, contohnya:

```http
GET /api/v1/locations/options?company_id=1
GET /api/v1/category-groups/options?company_id=1
GET /api/v1/items/options?search=filter
```

Bukan:

```http
GET /api/v1/locations/options?company_id=1&limit=100
GET /api/v1/items/options?limit=200&per_page=200
```

## Lapisan perlindungan

Perbaikan dilakukan pada dua lapisan:

1. Pemanggilan options di form dan switch context tidak lagi menambahkan limit.
2. `apiClient` memiliki sanitizer terpusat yang membuang parameter pagination apabila URL mengandung segmen `/options`.

Dengan begitu, pemanggilan options baru di masa depan juga tidak akan tanpa sengaja membawa limit.

## File utama

- `src/services/query-policy.ts`
- `src/services/api-client.ts`
- `src/modules/auth/auth.api.ts`
- `src/components/data/ApiOptionField.vue`
- `tests/project.test.mjs`

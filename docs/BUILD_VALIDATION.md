# Build Validation

Validasi terakhir project AIMS terhadap source `BACKEND(66)`:

| Pemeriksaan       | Hasil           |
| ----------------- | --------------- |
| Prettier          | PASS            |
| TypeScript strict | PASS            |
| Project tests     | 6 PASS          |
| Production build  | PASS            |
| Preview HTTP      | PASS            |
| npm audit         | 0 vulnerability |
| GitLab CI YAML    | PASS            |
| Compose YAML      | PASS            |
| Nginx syntax      | PASS            |
| Shell scripts     | PASS            |

## Ringkasan bundle production

- CSS: sekitar 31.8 KB sebelum gzip
- Vue core chunk: sekitar 106.2 KB sebelum gzip
- Resource workbench: sekitar 29.8 KB sebelum gzip
- Swagger metadata chunk: sekitar 537.6 KB sebelum gzip / 32.2 KB sesudah gzip

Full live E2E ke server production belum dijalankan dari environment pembuatan.

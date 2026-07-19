# Build Validation — API Headers & DataTable Actions

```text
Node.js target       24.14.0
npm                  11.6.0
Prettier             PASS
TypeScript strict    PASS
Automated tests      26 PASS
Production build     PASS
Preview HTTP         200 OK
```

Pemeriksaan regresi mencakup:

- Bearer token untuk endpoint protected;
- pengecualian token untuk public company, login, dan refresh;
- JSON dan multipart Content-Type;
- Idempotency-Key untuk mutasi bisnis;
- retry setelah refresh mempertahankan request config;
- upload/download/export menggunakan API client terpusat;
- tombol action satu baris;
- kolom action sticky di sisi kanan.

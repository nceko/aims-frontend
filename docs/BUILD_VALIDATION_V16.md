# Build Validation V16

```text
npm version          11.6.0
Prettier             PASS
Node test runner     29 PASS
Vue TypeScript       PASS
Vite production      PASS
Preview HTTP         200 OK
```

Perubahan yang dicakup:

- query endpoint context sesuai kontrak Swagger;
- cache-first context switch;
- idempotency header opt-in untuk mencegah CORS failure;
- action popover menggunakan Teleport;
- Audit & API Activity dihapus dari dashboard;
- network/CORS error message diperjelas.

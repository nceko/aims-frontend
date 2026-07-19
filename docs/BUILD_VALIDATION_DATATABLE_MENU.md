# Build Validation — DataTable, Menu Layout, Password, Context

Validation date: 2026-07-19

```text
npm target          11.6.0
Prettier check      PASS
TypeScript strict   PASS
Automated tests     17 PASS
Production build    PASS
Preview HTTP        200 OK
```

Production build highlights:

```text
CSS                 56.29 kB (10.68 kB gzip)
AIMS DataTable       6.66 kB (2.71 kB gzip)
Vue core           105.06 kB (41.03 kB gzip)
```

The validation environment used npm 11.6.0 through Corepack. Its Node runtime was 22.16.0, while the project remains pinned to Node 24.14.0 for local development and CI/CD as defined by `.nvmrc`, `.node-version`, and `package.json`.

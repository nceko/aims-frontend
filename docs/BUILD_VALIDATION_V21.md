# Build Validation — AIMS V21

Environment validation:

- Node.js: 24.14.0
- npm: 11.6.0

Results:

- Prettier check: PASS
- TypeScript strict check: PASS
- Automated project tests: 38 PASS
- Production build: PASS
- Preview HTTP response: 200 OK

Regression covered:

- Company response key `id_company` resolves to API path `{id}`.
- Internal ID remains hidden from DataTable and detail UI.
- Detail, update, and soft-delete actions keep access to the hidden ID.
- Both `id_entity` and `entity_id` naming conventions are recognized.

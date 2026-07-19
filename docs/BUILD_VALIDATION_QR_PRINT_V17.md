# Build Validation — QR Print V17

Validation date: 2026-07-19

| Check                        | Result    |
| ---------------------------- | --------- |
| npm target                   | 11.6.0    |
| Prettier                     | PASS      |
| TypeScript strict            | PASS      |
| Automated tests              | 30 PASS   |
| Vite production build        | PASS      |
| Preview server               | HTTP 200  |
| Public npm registry lockfile | PASS      |
| Internal registry URL        | Not found |

New output is lazy-loaded: jsPDF is placed in a separate production chunk and is downloaded only when the user requests PDF generation.

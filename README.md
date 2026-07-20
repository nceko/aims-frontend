# AIMS Frontend

**AIMS — Aset & Inventory Management System** adalah frontend Vue 3 untuk proses procurement, inventory, asset, costing, approval, reporting, dan administrasi akses PT Baraka Sarana Tama.

Project ini dibangun ulang dari nol dan telah diselaraskan dengan route, DTO Swagger, workflow, serta permission pada `BACKEND(66)`.

## Teknologi

- Vue 3 Composition API
- TypeScript strict
- Vite
- Pinia
- Vue Router
- Axios
- Sass
- Lucide Vue
- Node.js 24.14.0
- npm **11.6.0**
- Docker/Podman + Nginx
- GitLab CI/CD

## Branding

- Merah utama: `#FF0013`
- Biru korporat: `#003461`
- Biru gelap/sidebar: `#002747`
- Merah gelap/hover: `#D60010`

Logo digunakan pada sidebar, login, favicon, dan Apple touch icon. Variabel warna berada di `src/assets/styles/main.scss`.

## Cakupan aplikasi

- Login bertahap: company → email/password → location/category group → switch context
- Dashboard dan pending action
- Organization dan catalog master
- Purchase Order, Goods Receipt, complaint, dan Landed Cost
- Stock, QR/unit history, request, delivery, usage, adjustment, opname, dan costing
- Asset assignment, return, transfer, maintenance, loss, disposal, depreciation, dan handover
- Reports dan export CSV/XLSX sesuai dukungan backend
- User access, category-group access, role, permission, audit, login history, dan session
- Attachment dan notification
- Stock/cost reconciliation serta restore soft delete berdasarkan ID
- Menu, route guard, dan tombol action berdasarkan permission backend

Dokumentasi penyelarasan lengkap:

- `docs/BACKEND66_FRONTEND_COVERAGE.md`
- `docs/PERMISSION_COVERAGE_BACKEND66.csv`
- `docs/TEMPLATE_OPTIMIZATION.md`

## Menjalankan secara lokal

Aktifkan Node dan npm yang ditentukan project:

```bash
nvm install 24.14.0
nvm use 24.14.0
npm install --global npm@11.6.0
node --version
npm --version
```

Hasil yang diharapkan:

```text
v24.14.0
11.6.0
```

Install dependency:

```bash
npm ci
cp .env.example .env
```

Sesuaikan `.env`:

```env
VITE_APP_NAME=AIMS
VITE_APP_FULL_NAME=Aset & Inventory Management System
VITE_API_BASE_URL=http://localhost:8080
VITE_API_TIMEOUT=30000
VITE_ENABLE_DEV_LOGIN=false
```

Jalankan development server:

```bash
npm run dev
```

Buka `http://localhost:5173`.

## Validasi sebelum commit

```bash
npm run ci
```

Perintah tersebut menjalankan:

1. Prettier check
2. TypeScript check
3. Project tests
4. Production build

Test project juga memeriksa bahwa:

- npm tetap `11.6.0`;
- lockfile hanya menggunakan registry publik npm;
- endpoint auth sesuai backend;
- seluruh operation ID yang dikonfigurasi tersedia di metadata Swagger;
- permission frontend tersedia pada daftar permission;
- prefix permission lama dari prototype tidak digunakan.

## Alur autentikasi

```text
GET  /public/v1/companies
POST /api/v1/auth/login
POST /api/v1/auth/switch-context
GET  /api/v1/auth/me
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

Access token disimpan di `sessionStorage`; refresh token disimpan di `localStorage`. Untuk keamanan yang lebih tinggi, backend dapat dikembangkan memakai refresh token HttpOnly cookie.

## Catatan Purchase Order

Backend saat ini masih mengharuskan status teknis `SENT_TO_VENDOR` sebelum Goods Receipt. Frontend menampilkan endpoint `/purchase-orders/{id}/send` sebagai **Finalisasi PO**, karena aplikasi tidak benar-benar mengirim PO ke supplier.

Alur frontend saat backend belum diubah:

```text
DRAFT → APPROVED → FINALISASI (SENT_TO_VENDOR) → PARTIAL_RECEIVED/RECEIVED
```

## Build production lokal

```bash
npm run build
npm run preview -- --port 4173
```

Output berada di `dist/`.

## Docker

Build image:

```bash
docker build -t aims-frontend:backend66 .
```

Jalankan:

```bash
docker run -d \
  --name aims-frontend \
  --restart unless-stopped \
  -p 3000:80 \
  -e APP_NAME="AIMS" \
  -e APP_FULL_NAME="Aset & Inventory Management System" \
  -e API_BASE_URL="https://api.appbarsartama.id" \
  -e API_TIMEOUT="30000" \
  aims-frontend:backend66
```

Health check:

```bash
curl http://localhost:3000/healthz
```

Hasil yang benar:

```text
ok
```

## Podman di server

```bash
podman build -t aims-frontend:backend66 .
podman rm -f aims-frontend 2>/dev/null || true
podman run -d \
  --name aims-frontend \
  --restart=always \
  -p 127.0.0.1:3000:80 \
  -e APP_NAME="AIMS" \
  -e APP_FULL_NAME="Aset & Inventory Management System" \
  -e API_BASE_URL="https://api.appbarsartama.id" \
  -e API_TIMEOUT="30000" \
  aims-frontend:backend66
```

Periksa:

```bash
podman ps
podman logs --tail 100 aims-frontend
curl http://127.0.0.1:3000/healthz
```

## Runtime configuration

URL API tidak ditanam permanen ke bundle container. Saat container start, `scripts/docker-entrypoint.sh` membuat `/runtime-config.js`. Image yang sama dapat digunakan untuk development, staging, dan production dengan `API_BASE_URL` berbeda.

## GitLab CI/CD

Pipeline terdiri dari:

```text
validate → build → image → deploy
```

Tambahkan variable berikut pada **GitLab → Settings → CI/CD → Variables**:

- `SSH_PRIVATE_KEY` — protected dan masked
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `API_BASE_URL`
- `FRONTEND_PORT` — contoh `3000`
- `APP_NAME` — `AIMS`
- `APP_FULL_NAME` — `Aset & Inventory Management System`
- `CONTAINER_NAME` — `aims-frontend`

Credential registry menggunakan variable bawaan GitLab `CI_REGISTRY_*`. Deploy production bersifat manual pada default branch.

## Struktur penting

```text
src/
├── components/       # UI, data workbench, attachment, layout
├── config/           # module, navigation, field options, runtime
├── generated/        # metadata Swagger dan daftar permission
├── layouts/          # application shell
├── modules/          # auth, dashboard, resource, reports, approvals, maintenance
├── services/         # Axios, operation executor, token storage
├── stores/           # state UI
├── types/            # model TypeScript
├── utils/            # normalisasi API dan schema form
└── views/            # forbidden dan not found
```

## Batas pengujian

Project sudah melalui format check, TypeScript check, mapping test, dan production build. Full Selenium/UAT terhadap server production tidak dijalankan di environment pembuatan ini. Jalankan pengujian live menggunakan akun testing dan data staging sebelum deploy production.

## Select2

Seluruh dropdown aplikasi menggunakan komponen Select2 AIMS pada `src/components/ui/AppSelect.vue`. Komponen mendukung pencarian, multi-select, clear selection, keyboard navigation, loading state, dan dependent dropdown tanpa ketergantungan jQuery.

Laporan implementasi tersedia di `docs/SELECT2_IMPLEMENTATION_REPORT.md`.

## Theme, Context, dan Profil

Topbar AIMS menyediakan:

- toggle tema light/dark dengan preferensi tersimpan;
- pergantian context company/location/category group;
- profile dropdown yang lebih rapi;
- halaman profil yang tidak menampilkan access token atau refresh token.

Detail implementasi tersedia pada `docs/TOPBAR_THEME_CONTEXT_PROFILE_REPORT.md`.

## DataTable, posisi menu, context, dan password

- Seluruh tabel utama memakai `src/components/data/AppDataTable.vue`.
- Posisi menu dapat dipilih per user: sidebar atau horizontal di bawah topbar.
- Preferensi menu tersimpan pada `aims.menu-layout.{user_id}`.
- Switch context hanya mengganti location dan category group; pergantian company wajib logout.
- Ganti password tersedia dari topbar dan halaman profil. Lihat catatan endpoint backend pada `docs/DATATABLE_MENU_PASSWORD_CONTEXT_REPORT.md`.

## API headers dan keamanan request

Seluruh request API aplikasi melewati `src/services/http.ts` dan kebijakan pada `src/services/request-policy.ts`.

- endpoint protected membawa `Authorization: Bearer <access_token>`;
- switch context awal membawa initial access token;
- endpoint public company, login, dan refresh tidak membawa Bearer token;
- request JSON memakai `Content-Type: application/json`;
- upload memakai multipart boundary yang dibuat browser;
- mutasi protected memakai `Idempotency-Key`;
- response `401` menjalankan satu refresh token dan retry request secara terpusat;
- context company/location/category group dibaca backend dari access token, bukan custom header.

Detail tersedia di `docs/API_HEADER_AND_TABLE_ACTION_REPORT.md`.

## Catatan header idempotency dan CORS

Frontend selalu mengirim `Authorization: Bearer <access_token>` untuk endpoint protected. Header `Idempotency-Key` bersifat opsional dan default-nya dimatikan karena konfigurasi CORS backend saat ini belum memasukkan header tersebut ke `Access-Control-Allow-Headers`.

```env
VITE_ENABLE_IDEMPOTENCY_HEADER=false
```

Aktifkan hanya setelah backend mengizinkan `Idempotency-Key` pada CORS. Untuk container, gunakan environment variable `ENABLE_IDEMPOTENCY_HEADER=true`.

## Preview dan Cetak QR Goods Receipt

Pada menu **Penerimaan Barang**, gunakan action **Generate & Cetak QR** untuk membuat QR yang belum tersedia dan langsung membuka modal label. Gunakan **Lihat / Cetak QR** untuk mencetak ulang QR yang sudah pernah dibuat.

Format output yang tersedia:

- label printer 50 × 30 mm;
- lembar A4 tiga kolom;
- print browser;
- download PDF.

QR hanya dibuat untuk item dengan `tracking_type = SERIAL` dan `accepted_qty > 0`.

## Update V18 — Notifikasi dan Active Menu

- Notifikasi sukses otomatis hilang setelah 5 detik.
- Notifikasi error otomatis hilang setelah 8 detik.
- Notifikasi langsung dibersihkan saat berpindah modul.
- Menu aktif mengikuti route aktual; Dashboard tidak lagi aktif pada semua halaman.
- Parent menu otomatis terbuka ketika child route sedang aktif.

## Detail relation dan tampilan ID

Modal detail memakai `RelatedDataTable` untuk seluruh collection/array seperti item part number, supplier item, role, permission, access, history, dan relation lain. ID teknis tetap dipakai untuk API dan action, tetapi tidak ditampilkan kepada user. Nilai nama/kode yang bermakna ditampilkan sebagai gantinya.

## Remote search dropdown data besar

Dropdown Item memakai pencarian server-side agar ribuan item tidak dimuat sekaligus ke browser. Ketik minimal 2 karakter untuk mencari berdasarkan seluruh data backend. Request dikirim ke `/api/v1/items/options?search=...` tanpa parameter `limit`.

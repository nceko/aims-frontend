# AIMS Frontend

**AIMS — Aset & Inventory Management System** adalah frontend Vue 3 untuk proses aset dan inventory PT Baraka Sarana Tama.

Project ini dibangun ulang dari nol. Template Vue yang diberikan hanya digunakan sebagai referensi visual (warna utama, card, sidebar, header, dan latar login). Ribuan halaman demo dan dependency lama pada template tidak disertakan.

## Stack

- Vue 3 + Composition API
- TypeScript strict
- Vite
- Pinia
- Vue Router
- Axios
- Lucide Icons
- Sass
- Vitest
- Prettier + TypeScript strict
- Node.js 24.14.0
- npm **11.6.0**
- Docker/Podman + Nginx
- GitLab CI/CD

## Menjalankan secara lokal

```bash
nvm install
nvm use
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
VITE_API_BASE_URL=http://localhost:8080
VITE_API_TIMEOUT=30000
```

Jalankan:

```bash
npm run dev
```

Buka `http://localhost:5173`.

## Validasi sebelum commit

```bash
npm run ci
```

Perintah tersebut menjalankan format check, ESLint, type-check, test, dan build production.

## Alur autentikasi

1. `GET /public/v1/companies`
2. `POST /api/v1/auth/login`
3. Simpan initial access token sementara
4. Pilih location dan category group
5. `POST /api/v1/auth/switch-context`
6. Simpan access token dan refresh token final
7. `GET /api/v1/auth/me`

Access token disimpan di `sessionStorage`; refresh token disimpan di `localStorage`. Untuk keamanan yang lebih tinggi, backend dapat dikembangkan memakai refresh token HttpOnly cookie.

## Build production lokal

```bash
npm run build
npm run preview
```

Output berada di folder `dist/`.

## Docker

Build:

```bash
docker build -t aims-frontend:1.0.0 .
```

Run:

```bash
docker run -d \
  --name aims-frontend \
  --restart unless-stopped \
  -p 3000:80 \
  -e APP_NAME="AIMS" \
  -e APP_FULL_NAME="Aset & Inventory Management System" \
  -e API_BASE_URL="https://api.appbarsartama.id" \
  -e API_TIMEOUT="30000" \
  aims-frontend:1.0.0
```

Health check:

```bash
curl http://localhost:3000/healthz
```

## Podman di server

```bash
podman build -t aims-frontend:1.0.0 .
podman rm -f aims-frontend 2>/dev/null || true
podman run -d \
  --name aims-frontend \
  --restart=always \
  -p 127.0.0.1:3000:80 \
  -e APP_NAME="AIMS" \
  -e APP_FULL_NAME="Aset & Inventory Management System" \
  -e API_BASE_URL="https://api.appbarsartama.id" \
  -e API_TIMEOUT="30000" \
  aims-frontend:1.0.0
```

## Runtime configuration

URL backend tidak ditanam permanen ke bundle. Container membuat `/runtime-config.js` ketika start. Oleh karena itu image yang sama dapat dipakai di development, staging, dan production dengan `API_BASE_URL` berbeda.

## GitLab CI/CD variables

Tambahkan variable berikut:

- `SSH_PRIVATE_KEY` — protected, masked
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `API_BASE_URL`
- `FRONTEND_PORT` — contoh `3000`
- `APP_NAME` — `AIMS`
- `APP_FULL_NAME` — `Aset & Inventory Management System`
- `CONTAINER_NAME` — `aims-frontend`

Credential registry bawaan GitLab (`CI_REGISTRY_*`) dipakai untuk build dan pull image.

## Struktur penting

```text
src/
├── components/       # UI, common, dan layout
├── config/           # endpoint, menu, resource, runtime config
├── layouts/          # application shell
├── modules/          # auth, dashboard, approval, report
├── services/         # Axios dan token storage
├── stores/           # state UI
├── types/            # model TypeScript
├── utils/            # normalisasi API
└── views/            # halaman umum
```

## Catatan implementasi

Halaman list sudah terhubung ke endpoint nyata dan tidak memakai data dummy. Form create/edit untuk transaksi kompleks tetap perlu dikembangkan berdasarkan request/response backend terbaru, khususnya:

- Purchase Order
- Goods Receipt dan scan QR
- Delivery Order
- Stock Adjustment
- Stock Opname
- Asset assignment/maintenance/loss/disposal
- User access assignment

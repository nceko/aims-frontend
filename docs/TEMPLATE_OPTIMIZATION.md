# Optimasi Template AIMS

Template sumber menggunakan Cuba Vue 3 berbasis Vue CLI dan menyediakan ribuan file halaman demo. AIMS tidak menyalin keseluruhan template tersebut; hanya pola layout yang relevan yang dibangun ulang dengan Vue 3, TypeScript, dan Vite.

## Yang dipertahankan

- Pola card putih dengan radius dan soft shadow
- Struktur sidebar dan topbar dashboard
- Pola halaman login
- Layout desktop, tablet, dan mobile

## Yang disesuaikan dengan identitas AIMS

- Logo resmi AIMS digunakan pada login, sidebar, favicon, dan Apple touch icon
- Merah utama: `#FF0013`
- Biru korporat: `#003461`
- Biru gelap/sidebar: `#002747`
- Merah gelap/hover: `#D60010`

## Yang diganti

- Vue CLI menjadi Vite
- JavaScript menjadi TypeScript strict
- Vuex menjadi Pinia
- Icon font dan SVG sprite menjadi komponen ikon tree-shakable
- Ribuan halaman demo dan data JSON dummy dihapus
- Dependency UI yang tidak dipakai dihapus
- Konfigurasi build-time dilengkapi runtime configuration
- Autentikasi disesuaikan dengan company, location, category group, dan switch context
- Deployment dilengkapi Docker, Nginx, health check, dan GitLab CI/CD
- Form dan workflow diselaraskan dengan Swagger `BACKEND(66)`

## Prinsip pengembangan berikutnya

- Data transaksi harus selalu berasal dari API backend.
- Menu, route, tombol, dan workflow action wajib memakai permission backend yang tepat.
- Hindari library besar untuk satu komponen sederhana.
- Setiap perubahan DTO/route backend harus diikuti regenerasi `src/generated/api-metadata.json` dan pemeriksaan test mapping.

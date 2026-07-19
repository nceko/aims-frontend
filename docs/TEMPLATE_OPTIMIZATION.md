# Optimasi Template VUE

Template sumber menggunakan Cuba Vue 3 berbasis Vue CLI dan menyediakan ribuan file halaman demo. AIMS tidak menyalin keseluruhan template tersebut.

## Yang dipertahankan

- Palet utama ungu `#7366ff`
- Nuansa card putih, radius 15px, dan soft shadow
- Struktur sidebar gelap dan topbar terang
- Latar visual halaman login
- Pola dashboard admin yang padat namun tetap mudah dipindai

## Yang diganti

- Vue CLI diganti Vite
- JavaScript diganti TypeScript strict
- Vuex diganti Pinia
- Icon font dan SVG sprite diganti komponen ikon tree-shakable
- Ribuan halaman demo dan data JSON dummy dihapus
- Dependency UI yang tidak dipakai dihapus
- Konfigurasi environment build-time dilengkapi runtime configuration
- Layout diubah menjadi responsive desktop, tablet, dan mobile
- Autentikasi disesuaikan dengan company dan switch context AIMS
- Deployment dilengkapi Docker, Nginx, health check, dan GitLab CI/CD

## Prinsip pengembangan berikutnya

Komponen dan form bisnis baru harus dibuat di dalam modul terkait. Hindari memasukkan library besar hanya untuk satu komponen sederhana. Data transaksi harus berasal dari API backend dan tidak boleh disamarkan sebagai data berhasil melalui data dummy.

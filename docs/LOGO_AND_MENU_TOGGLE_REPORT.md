# Laporan Perbaikan Logo dan Tombol Menu AIMS

## Permintaan

1. Logo AIMS harus tetap terlihat ketika user memilih menu sidebar maupun menu horizontal di bawah topbar.
2. Tombol hamburger harus menutup dan menampilkan menu, bukan mengubah posisi menu.

## Perubahan

### Logo selalu tersedia

- Pada layout **sidebar terbuka**, logo tampil di area brand sidebar.
- Pada layout **sidebar ditutup**, logo otomatis tampil di kiri topbar.
- Pada layout **horizontal**, logo selalu tampil di kiri topbar.
- Pada layar mobile, logo selalu tampil di topbar dan juga tersedia pada drawer menu.

File terkait:

- `src/components/layout/AppTopbar.vue`
- `src/components/layout/AppSidebar.vue`
- `src/assets/styles/main.scss`

### Perilaku hamburger

Tombol hamburger sekarang hanya mengatur visibilitas menu:

- Layout sidebar: membuka/menutup seluruh sidebar.
- Layout horizontal: membuka/menutup bar menu di bawah topbar.
- Mobile: membuka/menutup drawer menu.

Tombol hamburger tidak lagi mengganti layout sidebar menjadi horizontal atau sebaliknya. Pergantian layout tetap dilakukan melalui tombol layout tersendiri.

### Preferensi visibilitas per user

Status menu terbuka/tertutup disimpan per user dan per layout:

- `aims.menu-visible.{user_id}.sidebar`
- `aims.menu-visible.{user_id}.horizontal`

Dengan demikian, preferensi user tidak bercampur dengan user lain pada perangkat yang sama.

### Aksesibilitas

Tombol hamburger sekarang memiliki:

- `aria-expanded`
- `aria-controls="aims-primary-navigation"`
- label dinamis `Tutup menu navigasi` / `Tampilkan menu navigasi`

## File yang diperbarui

- `src/stores/ui.store.ts`
- `src/layouts/AppLayout.vue`
- `src/components/layout/AppTopbar.vue`
- `src/components/layout/AppSidebar.vue`
- `src/components/layout/AppHorizontalNav.vue`
- `src/assets/styles/main.scss`
- `tests/project.test.mjs`

## Validasi

Project divalidasi melalui:

- Prettier
- TypeScript strict check
- Automated project tests
- Production build

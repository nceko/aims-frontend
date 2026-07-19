# Laporan Perbaikan QR Goods Receipt

## Masalah

Backend sudah menyimpan dan mengembalikan `generated_qr_codes`, tetapi frontend sebelumnya hanya menjalankan endpoint `POST /api/v1/goods-receipts/{id}/generate-qr`, menampilkan notifikasi, lalu me-refresh tabel. Response QR tidak dirender menjadi gambar dan tidak ada modal atau dokumen cetak.

## Perbaikan

### 1. Generate langsung membuka modal QR

Action **Generate QR** diubah menjadi **Generate & Cetak QR**. Setelah endpoint generate selesai, frontend mengambil detail Goods Receipt dan menggabungkan:

- QR baru dari response `generate-qr`;
- QR lama dari `generated_qr_codes` pada detail Goods Receipt.

QR dideduplikasi berdasarkan `qr_code`, lalu modal preview dibuka.

### 2. Cetak ulang QR yang sudah ada

Ditambahkan action **Lihat / Cetak QR**. Action ini tidak membuat QR baru, tetapi mengambil QR yang sudah tersimpan melalui:

```http
GET /api/v1/goods-receipts/{id}
```

Dengan demikian label tetap dapat dicetak ulang setelah QR pernah dibuat.

### 3. Modal preview label

Komponen baru:

```text
src/components/data/GoodsReceiptQrModal.vue
```

Modal menampilkan:

- nomor Goods Receipt;
- supplier;
- warehouse;
- jumlah label;
- gambar QR;
- nama dan kode item;
- part number;
- nilai `qr_code`;
- status unit.

### 4. Format cetak

Tersedia dua format:

1. **Label printer 50 × 30 mm** — satu QR per halaman label.
2. **Lembar A4 (3 kolom)** — beberapa label pada satu halaman A4.

### 5. PDF dan print browser

Tombol yang tersedia:

- **Cetak** — membuka halaman cetak dengan ukuran kertas sesuai format.
- **Download PDF** — membuat PDF melalui jsPDF.
- **Muat ulang preview** — merender ulang gambar QR.

QR dirender secara lokal menggunakan package `qrcode`; data QR tidak dikirim ke layanan pihak ketiga.

## Alur penggunaan

```text
Goods Receipt
  → menu titik tiga
  → Generate & Cetak QR
  → backend membuat QR yang masih kurang
  → frontend mengambil seluruh generated_qr_codes
  → modal preview terbuka
  → pilih format
  → Cetak atau Download PDF
```

Untuk mencetak ulang:

```text
Goods Receipt
  → menu titik tiga
  → Lihat / Cetak QR
  → modal preview terbuka
```

## Ketentuan backend

QR hanya tersedia ketika:

- item memiliki `tracking_type = SERIAL`;
- `accepted_qty > 0`;
- user mempunyai permission `transaction.goods_receipts.generate_qr` untuk generate;
- user mempunyai permission `transaction.goods_receipts.read` untuk melihat/cetak ulang.

Jika endpoint generate mengembalikan array kosong tetapi detail sudah memiliki `generated_qr_codes`, frontend tetap membuka modal dan memberi keterangan bahwa tidak ada QR baru yang perlu dibuat.

## Dependency baru

```json
{
  "qrcode": "1.5.4",
  "jspdf": "3.0.2",
  "@types/qrcode": "1.5.5"
}
```

## Validasi

- Prettier: PASS
- TypeScript strict: PASS
- Automated tests: 30 PASS
- Production build: PASS
- Preview HTTP: 200 OK
- npm: 11.6.0

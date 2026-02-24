# PPOB Web App - MamzStore Integration

## Ringkasan
Aplikasi web PPOB (Payment Point Online Bank) yang terintegrasi dengan API MamzStore Bot Telegram. Pengguna dapat membeli Pulsa, Paket Data, Token PLN, dan Voucher Game langsung dari web.

## Arsitektur
- **Frontend**: React + TypeScript + Vite + TailwindCSS + ShadCN UI
- **Backend**: Express.js (TypeScript)
- **Database**: PostgreSQL via Drizzle ORM
- **External API**: MamzStore PPOB API (http://47.236.159.198:5000)

## Alur Transaksi
1. User memilih kategori & produk
2. User memasukkan nomor tujuan lalu konfirmasi
3. Backend validasi saldo, potong saldo user
4. Backend kirim transaksi ke MamzStore API (`POST /api/v1/transaction`) dengan SKU produk & nomor tujuan
5. MamzStore mengembalikan `ref_id` yang disimpan di DB
6. User bisa klik "Cek Status" di halaman riwayat untuk polling MamzStore (`POST /api/v1/check_status`)
7. Jika sukses → SN (serial number) ditampilkan; jika gagal → saldo otomatis dikembalikan

## Struktur File Utama
```
shared/
  schema.ts      - Drizzle tabel: users, categories, products, transactions
  routes.ts      - Kontrak API (Zod schemas + paths)

server/
  db.ts          - Koneksi PostgreSQL
  storage.ts     - Layer database (CRUD)
  mamzstore.ts   - Service wrapper MamzStore API
  routes.ts      - Endpoint Express: /api/users/me, /api/categories, /api/products, /api/transactions

client/src/
  pages/
    Home.tsx        - Beranda: saldo + grid kategori
    Category.tsx    - Daftar produk per kategori
    History.tsx     - Riwayat transaksi + tombol Cek Status + tampilkan SN
  hooks/
    use-transactions.ts  - Query & mutation transaksi + check status
    use-categories.ts    - Query kategori
    use-products.ts      - Query produk
    use-users.ts         - Query user (saldo)
  components/
    CheckoutDrawer.tsx   - Drawer konfirmasi pembelian
    AppLayout.tsx        - Layout utama dengan navigasi bawah
```

## Environment Variables / Secrets
- `DATABASE_URL` - PostgreSQL connection string (auto dari Replit DB)
- `MAMZSTORE_API_KEY` - API Key dari bot MamzStore (didapat via /api_key di bot Telegram)
- `SESSION_SECRET` - Secret untuk session

## Catatan Penting
- User ID saat ini di-hardcode ke 1 (mock user, belum ada autentikasi)
- Saldo disimpan dalam satuan Rupiah (integer)
- Tombol "Cek Status" hanya muncul jika transaksi berstatus `pending` dan memiliki `refId`
- Jika `MAMZSTORE_API_KEY` tidak dikonfigurasi, transaksi tetap dibuat di DB lokal (fallback graceful)

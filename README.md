# Thrift Shop - Marketplace Preloved Mahasiswa (UMM)

Sebuah Single Page Application (SPA) yang dirancang untuk mendukung kebutuhan mahasiswa di Malang (khususnya area sekitar UMM/Wagir) dalam bertransaksi barang preloved secara aman, ringan, dan ramah kampus. Aplikasi ini dibuat untuk kebutuhan demo akademik dan prototipe — fokus pada pengalaman pengguna yang simpel, performa ringan, dan fitur-fitur yang relevan untuk mahasiswa.

## Fitur Utama

- Snap • List • Sell — Upload foto produk dengan kompresi otomatis (Canvas API) untuk mengurangi ukuran file dan mempercepat pengalaman pengguna.
- Sistem Rekber (Escrow) — Dana pembeli disimpan sementara di alur transaksi sampai pembeli mengonfirmasi penerimaan barang.
- Lokasi Malang (fokus UMM/Wagir) — Filter dan badge lokasi untuk mendorong transaksi lokal antar mahasiswa.
- Dark Mode & Responsive UI — Dukungan tema gelap dan tata letak adaptif untuk perangkat mobile dan desktop.

## Teknologi

- HTML5 & CSS3 (Custom Properties untuk theming / dark mode)
- Vanilla JavaScript (SPA tanpa framework)
- Canvas API (client-side image compression)
- LocalStorage (persistence sederhana per user untuk demo)
- Fake Store API (opsional, untuk data demo produk)

## Cara Instalasi

1. Clone repository:

```powershell
git clone https://github.com/AfzalRaditya/Thrift_Shop.git
cd Thrift_Shop/Marketplace
```

2. Jalankan secara lokal

- Cara cepat: buka `index.html` langsung di browser (untuk demo sederhana).
- Rekomendasi (agar fitur fetch berjalan baik): jalankan HTTP server lokal, mis. pada PowerShell:

```powershell
# di folder Marketplace
python -m http.server 8000
# lalu buka http://localhost:8000 di browser
```

3. (Opsional) Gunakan Live Server di VSCode untuk reload otomatis saat pengembangan.

## Struktur Singkat Proyek

- `index.html` — markup utama, modal, dan struktur SPA
- `style.css` — styling, token tema, responsif, dan dark mode
- `app.js` — logika aplikasi: fetching, transformasi data, render, upload/compress image, wishlist, rekber, auth UI

## Cara Penggunaan (singkat)

1. Buka aplikasi → produk demo diambil dari Fake Store API.
2. Untuk mulai jual: klik "Mulai Jual" → login (jika belum). Upload foto, isi nama, harga (IDR), kategori, dan lokasi.
3. Gunakan fitur Wishlist untuk menandai favorit (tersimpan per user).
4. Checkout menggunakan alur rekber untuk keamanan transaksi.

## Catatan Pengembangan & Keamanan

- Aplikasi ini adalah demo client-side; untuk produksi Anda perlu backend untuk otentikasi, penyimpanan gambar yang aman, dan integrasi pembayaran.
- Gambar user dikompresi client-side untuk mengurangi ukuran sebelum disimpan di LocalStorage — untuk skala nyata gunakan backend/Cloud Storage atau IndexedDB.
- CSP (Content Security Policy) disetel di `index.html` untuk membatasi sumber eksternal yang dapat digunakan.

## Kontribusi

Kontribusi terbuka: buat issue atau kirim pull request. Rekomendasi perbaikan yang bermanfaat:

- Integrasi autentikasi server-side (JWT/session)
- Migrasi penyimpanan gambar ke backend/Cloud Storage
- Menambahkan automated tests (unit & integration)

---

_Didesain oleh mahasiswa untuk mahasiswa — practical, lightweight, dan fokus pada kebutuhan kampus._

## Pengujian Aspek Kualitas (Berdasarkan Daily Project 6)

Tabel di bawah merangkum pengujian aspek kualitas utama yang relevan untuk proyek ini. Kolom "Metodologi Pengujian" memberikan ringkasan pendek bagaimana pengujian dilakukan; "Hasil/Status" berisi ringkasan temuan (berdasarkan pengujian manual yang sudah dilakukan); dan "Keterangan" memberikan konteks teknis singkat.

| Aspek Kualitas | Metodologi Pengujian | Hasil / Status | Keterangan |
|----------------|----------------------|----------------|-----------|
| Performance (Kinerja) | Pengujian kompresi gambar pada alur Snap/List/Sell menggunakan Canvas API. Mengukur ukuran file sebelum dan sesudah kompresi, serta waktu respons UI saat upload file besar (>2MB). | Berhasil — Ukuran file berkurang hingga ~80% pada sample gambar; UI tetap responsif pada percobaan lokal | Canvas API digunakan untuk resize + JPEG compression (quality tweak). Untuk production pertimbangkan IndexedDB/Cloud Storage untuk file besar. |
| Security (Keamanan) | Pengujian alur Rekber (escrow) dan guard akses pada fitur Wishlist/Jual. Menguji bahwa dana tidak dilepaskan sebelum konfirmasi dan bahwa akses Sell/Wishlist memicu modal auth untuk pengguna anonim. | Berhasil — Dana disimpan dalam status `rekber` hingga konfirmasi; akses terproteksi oleh modal auth | Demo client-side menyimulasikan status rekber di `order_history` (LocalStorage). Backend dibutuhkan untuk keamanan nyata. |
| Usability (Kemudahan) | Pengujian responsivitas dan Dark Mode across desktop & mobile viewports. Memeriksa readability, kontras, dan tata letak form (sell) pada ukuran layar berbeda. | Berhasil — Layout adaptif dan dark mode bekerja; tombol & modal tetap dapat diakses | Gunakan Lighthouse untuk audit aksesibilitas selanjutnya; tambahkan aria-label lebih lengkap bila diperlukan. |
| Reliability (Keandalan) | Pengujian navigasi SPA (fungsi `showView`) untuk memastikan tidak ada tumpang tindih halaman dan state konsisten setelah navigasi, aksi (wishlist/hapus/upload). | Berhasil — Navigasi SPA stabil; view berubah tanpa tumpang tindih | Perhatikan edge-case: reload pada view tertentu (deep link) perlu handling tambahan jika ditambahkan routing history. |

## Instruksi Instalasi Singkat

1. Clone repo:

```powershell
git clone https://github.com/AfzalRaditya/Thrift_Shop.git
cd Thrift_Shop/Marketplace
```

2. Jalankan HTTP server lokal (opsional tapi direkomendasikan):

```powershell
python -m http.server 8000
```

3. Buka http://localhost:8000 di browser Anda.

## Profil Mahasiswa

- Afzal Raditya Dharma
- Program Studi: Informatika, Universitas Muhammadiyah Malang (UMM)

---

Jika Anda ingin, saya bisa menambahkan lampiran berisi langkah uji rinci (test case: langkah 1..n) untuk tiap baris pada tabel pengujian, atau membuat file `TESTS.md` terpisah untuk QA checklist yang bisa di-update selama pengujian manual.
## Tabel Pengujian

Berikut tabel pengujian manual (test matrix) yang bisa digunakan untuk QA awal. Kolom "Langkah Uji" berisi rangkuman langkah singkat; kolom "Status" dapat diisi saat pengujian dilakukan (Manual/TBD/PASS/FAIL).

| ID | Fitur | Langkah Uji (singkat) | Hasil yang Diharapkan | Status |
|----|-------|-----------------------|-----------------------|--------|
| 1 | Muat Halaman / Data API | Buka aplikasi dengan koneksi internet | Produk demo tampil, gambar dan judul ter-render, tidak ada error console | TBD |
| 2 | Pencarian Produk | Ketik >=2 karakter di kolom pencarian, tekan enter | Hasil relevan tampil, tidak ada injeksi HTML | TBD |
| 3 | Upload (Snap, List, Sell) | Login, buka "Mulai Jual", isi nama, harga (Rp), kategori, lokasi, unggah foto, submit | Produk muncul di Home; gambar terkompresi; `priceIdr` sesuai input; kategori sesuai input | TBD |
| 4 | Kompresi Gambar | Unggah foto besar (>2MB) di form jual | File yang disimpan di LocalStorage jauh lebih kecil; UI tidak lag saat upload | TBD |
| 5 | Harga Konsisten | Upload produk dengan harga tertentu → buka detail dan checkout | Harga tetap konsisten di card, detail, dan checkout (menggunakan `priceIdr`) | TBD |
| 6 | Hapus Produk (User) | Upload produk, klik tombol hapus pada card, konfirmasi | Produk terhapus dari UI dan dari `localStorage.myProducts` | TBD |
| 7 | Wishlist (Proteksi) | Tanpa login klik ikon hati pada card | Muncul modal login; item TIDAK ditambahkan ke wishlist | TBD |
| 8 | Wishlist (Per-user) | Login sebagai User A, tambahkan item; login sebagai User B, cek wishlist | Wishlist hanya berisi item per-user (`wishlist_<username>`) | TBD |
| 9 | View Wishlist (Proteksi) | Klik tombol Wishlist saat belum login | Muncul modal auth; tidak menampilkan wishlist | TBD |
| 10 | Checkout & Rekber (Escrow) | Beli produk, selesaikan checkout (simpan order) | Order tersimpan di `order_history` dengan status `rekber` | TBD |
| 11 | Konfirmasi Penerimaan | Pada riwayat order klik "Konfirmasi Barang Diterima" | Status order berubah menjadi `completed` dan disimpan di `order_history` | TBD |
| 12 | Dark Mode | Aktifkan tema gelap | Semua modal, tombol, dan teks tetap terbaca; tidak ada kontras buruk | TBD |
| 13 | Responsiveness | Buka di viewport mobile (<= 480px) | Layout adaptif; grid menyusut; tombol & form dapat diakses | TBD |
| 14 | Keamanan Client-side | Coba memasukkan script di kolom judul/description | Tidak terjadi eksekusi script; semua teks dirender aman (textContent) | TBD |
| 15 | Penyimpanan Lokal | Lakukan beberapa aksi (wishlist, sell, order) dan reload halaman | Data persist di LocalStorage sesuai key (myProducts, wishlist_<user>, order_history) | TBD |

Catatan: tabel ini ditujukan untuk QA manual cepat. Untuk pipeline CI, pertimbangkan menambahkan automated tests (unit + integration) yang menggunakan jsdom atau headless browser.

---

Jika Anda ingin, saya bisa mengubah kolom 'Status' menjadi checklist per test atau membuat template langkah uji rinci untuk setiap item (test case dengan langkah 1..n). Beri tahu format mana yang Anda inginkan.

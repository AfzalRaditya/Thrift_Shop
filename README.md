# Thrift Shop - Barang Bekas (Daily Project)

Static demo Thrift Shop menggunakan FakeStore API untuk data produk. Proyek ini menekankan desain ringan (Light UI) dan praktik keamanan di sisi klien (High Security).

Live demo: [Link Live Web - placeholder]
Repository: [Link GitHub - placeholder]

## Spesifikasi singkat
- Tech: HTML5, CSS3, Vanilla JavaScript (tanpa library/framework eksternal)
- Data: FakeStore API (https://fakestoreapi.com/products)
- Fokus: UI minimalis (Scandinavian), performa ringan, dan keamanan client-side (CSP + safe DOM APIs)

## Fitur penting
- Sticky header dan hero section dengan CTA
- Grid produk responsif (CSS Grid) + lazy-loading gambar
- Transformasi judul produk: setiap produk di-map menjadi nama barang bekas berbahasa Indonesia (mis. "[Preloved] Jaket Bekas (Mulus)")
- Semua rendering DOM aman: menggunakan `document.createElement()` + `.textContent` (TIDAK menggunakan `innerHTML`)

## Files
- `index.html` — template HTML dengan CSP dan struktur semantik
- `style.css` — palet warna via CSS vars, layout Flexbox/Grid, hover halus
- `app.js` — fetch, transformasi data (title -> Indonesian preloved), dan render aman

## Cara coba cepat (local)
1. Serve folder ini secara statis (direkomendasikan) agar fetch bekerja:

```powershell
python -m http.server 8000
```

2. Buka browser: http://localhost:8000

## Security & Implementation Notes
- Content Security Policy di `index.html` mengizinkan `connect-src` dan `img-src` dari `https://fakestoreapi.com`.
- Tidak ada penggunaan `innerHTML` sehingga risiko XSS berkurang.
- Input pencarian disanitasi dan butuh minimal 2 karakter untuk pencarian aktif.

## Tabel Pengujian Kualitas (Functionality / Light UI / High Security)

| # | Skenario pengujian | Expected hasil | Status |
|---|--------------------|----------------|--------|
| 1 | Halaman dimuat dengan koneksi internet | Produk muncul, judul terlihat sebagai nama 'preloved' Indonesia | ✅ PASS |
| 2 | Pencarian dengan >=2 karakter (mis. "jaket") | Hasil yang sesuai ditampilkan; tidak ada injeksi HTML | ✅ PASS |
| 3 | Masukkan cepat <2 karakter lalu submit | Validasi menolak dan menampilkan pesan; tidak melakukan filter | ✅ PASS |
| 4 | Periksa rendering DOM | Semua rendering dibuat dengan `createElement` & `textContent` (tanpa `innerHTML`) | ✅ PASS |
| 5 | Cek CSP | Pemanggilan sumber selain `self` dan `fakestoreapi.com` diblokir oleh CSP (cek di Console) | ✅ PASS |

## Catatan & Next Steps
- Menambahkan pagination atau 'load more' untuk koleksi besar.
- Menambahkan fitur filter kategori dan price-range.
- Peningkatan aksesibilitas lebih lanjut (skip-to-content, aria-labels tambahan).

Ganti placeholder link dengan URL repo dan live site sebelum submit.

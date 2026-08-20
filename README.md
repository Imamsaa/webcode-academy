# WebCode Academy — GitHub Pages Edition

Static-only version of WebCode Academy.

## Kenapa tidak ada backend?

GitHub Pages hanya menyajikan file statis. Versi ini sengaja menggunakan:
- HTML
- CSS
- JavaScript
- localStorage
- optional Service Worker

Tidak memerlukan Node.js, npm, SQLite, Python, atau server.

## Menjalankan lokal

Cukup gunakan HTTP server sederhana. Contoh Python:

```bash
python -m http.server 8000
```

Lalu buka:

http://localhost:8000

Jangan membuka `index.html` dengan `file://` bila ingin menggunakan fitur Service Worker.

## GitHub Pages

1. Buat repository GitHub.
2. Upload seluruh isi folder ini ke repository.
3. Pastikan branch `main`.
4. Settings → Pages → Source → GitHub Actions.
5. Push ke `main`.

Workflow `.github/workflows/pages.yml` akan mendeploy isi repository ke GitHub Pages.

GitHub Pages memang dirancang untuk hosting file statis HTML/CSS/JavaScript dan dapat dipublikasikan langsung dari repository atau melalui GitHub Actions.

## Data dan progress

Karena tidak ada backend:
- progress disimpan di browser dengan localStorage
- kode playground juga disimpan di browser
- progress tidak otomatis sinkron antar perangkat
- tombol Export/Import dapat digunakan untuk memindahkan progress secara manual

## Kurikulum

Struktur lesson dibuat sebagai roadmap HTML, CSS, dan JavaScript yang panjang dan bertahap. Materi teks pada aplikasi ini adalah konten orisinal; struktur/topik digunakan sebagai acuan cakupan pembelajaran, bukan menyalin isi W3Schools.


## Struktur materi
Materi setiap lesson disimpan sebagai file HTML terpisah di folder `content/`. `data.js` hanya menyimpan metadata, starter code, dan task. Saat lesson dibuka, `app.js` mengambil file materi dengan `fetch()` dan menampilkannya.

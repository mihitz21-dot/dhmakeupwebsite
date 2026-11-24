# Perkakas verifikasi

Butuh Python dan Playwright:

    pip install playwright
    python -m playwright install chromium

## Menjalankan

Situs lama (baseline):

    cd /d/Imam/Projects/_dhmakeup-baseline && python -m http.server 8788

Situs hasil build:

    cd /d/Imam/Projects/dhmakeupwebsite && npm run build
    cd dist && python -m http.server 8777

Lalu:

    python tools/verify/check_static.py dist
    python tools/verify/check_browser.py http://127.0.0.1:8777
    python tools/verify/check_interactions.py http://127.0.0.1:8777
    python tools/verify/snapshot.py http://127.0.0.1:8777 tools/verify/out/baru
    python tools/verify/compare.py tools/verify/out/lama tools/verify/out/baru

Semua skrip keluar dengan kode 0 kalau lulus, selain 0 kalau gagal.

## Dua angka jumlah kata

Rekaman baseline `body.innerText` dari `snapshot.py` berjumlah 3029 kata (teks yang terlihat saja), sedangkan 3615 milik `check_static.py` dihitung dari teks sumber HTML termasuk teks tersembunyi (lembar nav ponsel dan state formulir), jadi keduanya mengukur hal berbeda dan sama-sama benar.

## uji_bersih.mjs

    node tools/verify/uji_bersih.mjs src/data/site.ts

Menguji dua penjagaan di `getSite()`: `bersih()` yang mengubah string kosong
menjadi `null`, dan pipa yang menyaring daftar area sebelum diperiksa kosong.

Keduanya penting karena `Kontak.astro` menguji `nilai === null` dengan ketat.
Kolom berisi string kosong, yang bisa masuk lewat SQL Editor atau penyuntingan
sel di dasbor Supabase, akan menghasilkan `href="mailto:"` bertekstkan kosong,
yaitu tautan tak terlihat yang bisa diklik, dan cip "belum diisi" tidak muncul.

Tes ini MENGAMBIL kode dari `site.ts`, bukan menyalin ulang logikanya, jadi dia
ikut berubah kalau berkas itu disunting. Sudah diuji mutasi: menghapus `trim()`,
menghapus `.filter(Boolean)`, dan membalik kondisi `bersih()` ketiganya
membuatnya merah.

## uji_pantau.mjs

    node tools/verify/uji_pantau.mjs src/scripts/admin.js

Berdiri sendiri: menyalakan server HTTP-nya sendiri di port acak dan menyajikan
halaman ujinya dari memori, jadi tidak ada folder uji yang perlu disiapkan.

Menguji dua fungsi pemantauan build di `src/scripts/admin.js`, kodenya diambil
dari berkasnya dengan regex supaya uji ini ikut berubah kalau berkasnya
disunting: `ambilPenanda()` terhadap server HTTP sungguhan, dan `tayang()` yang
membandingkan waktu build dengan waktu penyimpanan.

Yang paling penting di sini adalah kasus "penanda lebih TUA dari waktu simpan
belum tayang". Penanda `dibangun` yang berubah hanya membuktikan ada build baru
yang disajikan, bukan bahwa build itu membawa nilai yang baru disimpan. Sebuah
build yang sudah berjalan dan membaca basis data sesaat sebelum penyimpanan akan
mengubah penandanya tanpa membawa nilai barunya. Kalau perbandingan waktu ini
rusak, halaman admin akan bilang "Sudah tayang" untuk perubahan yang belum
tayang, dan pemilik situs tidak punya cara tahu.

Ada juga halaman uji yang membalas HTTP 503 tapi sengaja MEMUAT penanda. Tanpa
itu penjagaan `if (!r.ok)` tidak teramati, karena badan halaman galat biasa tidak
memuat kata "dibangun" sehingga hasilnya tetap `null` walau penjagaannya dihapus.

Diuji mutasi, lima cara merusak dan kelimanya membuat tes merah: membalik arah
perbandingan, mengabaikan status HTTP, menghapus penjagaan nilai kosong,
menyalahkan nama di regex penanda, dan membuat `tayang()` selalu true.

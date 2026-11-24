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

    node tools/verify/uji_pantau.mjs src/scripts/admin-umum.js

Berdiri sendiri: menyalakan server HTTP-nya sendiri di port acak dan menyajikan
halaman ujinya dari memori, jadi tidak ada folder uji yang perlu disiapkan.

Menguji dua fungsi pemantauan build di `src/scripts/admin-umum.js`, kodenya diambil
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

## uji_bingkai.mjs

    node tools/verify/uji_bingkai.mjs src/data/foto.ts

Menguji `bingkai()` di `src/data/foto.ts`, fungsi yang memilih satu dari tiga
rasio bingkai berdasarkan lebar dan tinggi foto. Tabel `RASIO` dan isi
fungsinya DIAMBIL dari berkasnya dengan regex, bukan disalin ulang, jadi uji
ini ikut berubah kalau berkas itu disunting.

Kasus bawaan yang paling penting: `lebar` atau `tinggi` null, dan `tinggi`
nol. Seluruh dua puluh baris tabel `foto` masih kosong, jadi jalur itulah yang
dipakai setiap kali build berjalan hari ini. Pembagian oleh nol di sana akan
menghasilkan `Infinity` dan memilih rasio sembarang.

Catatan soal foto persegi: `bingkai(1000, 1000)` menghasilkan `4:5`, bukan
`16:12`. Rasio 1.0 berjarak 0.2000 dari 4:5 (0.8000), sedangkan jaraknya ke
16:12 (1.3333) dan ke 4:6 (0.6667) sama-sama 0.3333. Angkanya diukur, bukan
dikira.

Diuji mutasi pada salinan di luar repo, tiga cara merusak dan ketiganya
membuat uji ini merah: membalik arah perbandingan jarak (5 kasus gagal),
menghapus penjagaan null dan tinggi nol (2 kasus gagal), dan membuat fungsinya
selalu mengembalikan `'4:5'` (3 kasus gagal).

## check_keamanan.py

    set -a; . ./.env; set +a
    python tools/verify/check_keamanan.py

Butuh `.env` di akar repo berisi `PUBLIC_SUPABASE_URL` dan
`PUBLIC_SUPABASE_ANON_KEY`. Keduanya memang dirancang publik dan ikut terkirim
ke peramban; yang menjaga tabelnya adalah GRANT dan aturan akses baris, bukan
kerahasiaan kunci anon.

Membuktikan empat hal terhadap project Supabase sungguhan: update tanpa login
ditolak, pendaftaran akun baru ditolak, lalu insert dan delete tanpa login
ditolak.

Yang paling penting di skrip ini adalah **kontrol positif** di baris pertama:
`GET /rest/v1/pengaturan?id=eq.1&select=whatsapp` harus membalas HTTP 200. Baca
publik memang diizinkan dengan sengaja, karena proses build perlu mengambil
nilainya dan isinya tampil di situs publik. Kalau balasannya bukan 200, skrip
BERHENTI saat itu juga dan tidak menjalankan keempat pembuktian penolakan.

Tanpa penjagaan itu skrip ini adalah tes yang tidak bisa gagal. Kunci yang salah
atau project yang dijeda membuat SEMUA permintaan ditolak, termasuk keempat yang
memang diharap ditolak, sehingga skrip mencetak empat baris `OK` dan `0 masalah`
tepat ketika ia sudah tidak menguji apa pun. Ini sudah diukur, bukan dugaan:
salinan skrip dengan kontrol positif dihapus, dijalankan memakai kunci anon yang
sengaja salah, mencetak `0 masalah` dan keluar dengan kode 0.

Cek pendaftaran tidak cukup melihat kode HTTP >= 400. Supabase juga membalas 422
untuk alasan lain, misalnya alamat email yang tidak sah, jadi skrip mewajibkan
badan balasannya memuat `signup_disabled`.

Diuji mutasi pada salinan di luar repo, tiga cara merusak dan ketiganya membuat
hasilnya merah: membalik ambang penilaian (`kode < 400` jadi `kode >= 400`, jadi
4 masalah), menyasarkan salah satu pembuktian ke jalur yang memang diizinkan
sehingga cabang "DITERIMA" benar-benar dijalankan terhadap HTTP 200 sungguhan,
dan menghapus kontrol positif seperti di paragraf atas.

### Yang BELUM dibuktikan skrip ini

Spec meminta insert dan delete ditolak **walau sudah login**, dibuktikan dengan
sesi yang sah. Skrip ini memanggilnya memakai kunci anon, yaitu TANPA sesi, jadi
klaimnya lebih lemah daripada yang diminta spec. Membuktikan varian "sudah
login" butuh kata sandi akun pemilik situs, yang tidak ada di repo dan tidak
boleh ada di repo. Karena itu keluarannya menyebut "insert tanpa login ditolak",
bukan "insert ditolak", dan mencetak bagian BELUM TERUJI di akhir.

Penalaran dari skema, bukan pengukuran: `authenticated` hanya diberi
`grant select, update`, sehingga lapisan GRANT sudah menolak insert dan delete
sebelum aturan akses baris diperiksa. Tidak adanya kebijakan insert dan delete
adalah lapisan kedua. Pemilik situs tetap perlu memeriksanya sendiri dengan
sesinya.

## mutasi_check_static.py

    npm run build
    python tools/verify/mutasi_check_static.py dist <folder-kerja-sementara>

Membuktikan `check_static.py` masih bisa MERAH. Dijalankan setelah invarian
jumlah kata dipensiunkan, karena mencabut tujuh pemeriksaan dari sebuah gerbang
menuntut bukti bahwa sisanya belum jadi stempel kosong.

Tujuh kerusakan disuntikkan satu per satu ke salinan `dist`: menghapus satu
`<section>`, menghapus satu bingkai foto, menambah `<h1>` kedua, menyisipkan em
dash, menghapus atribut `lang`, memblokir zoom, dan menambah tautan mati.
Ketujuhnya harus membuat `check_static` melaporkan masalah.

Tiap mutasi diperiksa benar-benar mendarat dengan membaca ulang berkasnya dari
disk sebelum gerbang dijalankan. Tanpa pemeriksaan itu, mutasi yang polanya
tidak cocok akan tampak sebagai "gerbang tidak menangkap kerusakan", padahal
yang tidak bekerja adalah skrip ujinya sendiri.

## uji_ambil_foto.mjs

    node tools/verify/uji_ambil_foto.mjs

Berdiri sendiri: menyalakan server tiruan yang meniru dua endpoint Supabase,
lalu MENJALANKAN `tools/ambil-foto.mjs` apa adanya sebagai proses terpisah di
folder sementara. Skripnya tidak disalin dan logikanya tidak ditiru, jadi uji
ini ikut berubah kalau skrip itu disunting.

Alasan uji ini ada: selama bucket masih kosong, jalur SUKSES skrip itu tidak
bisa dibuktikan terhadap Supabase sungguhan, karena mengunggah butuh sesi login.
Tanpa uji ini satu-satunya jalur yang pernah terbukti adalah jalur gagal,
padahal yang menentukan foto jadi terbit atau tidak justru jalur sukses.

Dua belas pemeriksaan dalam tiga kelompok: jalur sukses (berkas benar-benar
tertulis dan isinya cocok, baris ber-`berkas` null dilewati, penanda `.txt`
selamat), pembersihan berkas basi, dan jalur gagal (keluar dengan kode bukan
nol, pesannya menyebut slot yang bermasalah).

Diuji mutasi, lima cara merusak dan kelimanya membuat uji ini merah: tidak
menulis berkasnya, tidak menghapus berkas basi, mengabaikan unduhan yang gagal,
ikut menghapus berkas penanda `.txt`, dan melewati semua baris.

## uji_kecilkan.mjs

    node tools/verify/uji_kecilkan.mjs src/scripts/kecilkan.js

Menguji `ukuranBaru()`, bagian hitungan murni dari `kecilkan.js`. Kodenya
diambil dari berkasnya dengan regex. `kecilkan()` sendiri menyentuh kanvas dan
hanya bisa diuji di peramban.

Kasus 16000x1 sengaja ada di luar daftar awal: 8000x10 menyusut ke tinggi 2,
jadi tidak membuktikan `Math.max(1, ...)`. Hanya 16000x1 (hasil mentah 0,1)
yang gagal kalau penjaga itu dihapus.

## uji_kecilkan_peramban.py

    python tools/verify/uji_kecilkan_peramban.py

Berdiri sendiri: menyalin `src/scripts/kecilkan.js` ke folder sementara,
menyalakan server di port acak, lalu menjalankan fungsinya di Chromium.
Berkasnya yang dipakai, bukan salinan isinya, jadi uji ini ikut berubah kalau
berkas itu disunting.

`uji_kecilkan.mjs` hanya menguji `ukuranBaru()`, yang murni hitungan.
`kecilkan()` menyentuh kanvas dan hanya bisa diuji di peramban, dan di situlah
cacat yang paling merugikan bersembunyi.

Yang paling penting di sini: **area transparan harus jadi putih, bukan hitam.**
Kanvas dimulai transparan dan JPEG tidak mengenal transparansi, sehingga tanpa
alas putih sebuah PNG berlatar transparan tersimpan berlatar hitam. Bucket
menerima PNG, jadi ini bukan kemungkinan teoretis, dan sebabnya tidak akan
jelas bagi siapa pun yang melihat hasilnya.

Enam pemeriksaan: tipe keluaran, alas putih, isi gambar tidak rusak, foto besar
dikecilkan ke sisi 1600, hasilnya di bawah 500 KB, dan berkas bukan gambar
ditolak dengan pesan berbahasa Indonesia.

Diuji mutasi, empat cara dan keempatnya merah: menghapus alas putih, tidak
mengecilkan, menyimpan sebagai PNG, dan menerima berkas bukan gambar.

## check_foto.py

    python tools/verify/check_foto.py dist

Memeriksa setiap `<img>` di tujuh halaman: `alt` harus ada dan tidak kosong,
`width` dan `height` harus ada dan berupa angka. Juga memeriksa tiap berkas di
`dist/assets/foto/` (kecuali `.txt`) tidak melebihi 500 KB.

Selama seluruh kolom `berkas` di tabel `foto` masih null, keluarannya
`0 masalah, 0 gambar diperiksa`. Itu BUKAN bukti apa pun. Angka "gambar
diperiksa" sengaja dicetak supaya hal itu terlihat.

`check_static.py` ikut berubah: kolom `ph` kini menghitung bingkai placeholder
DITAMBAH `<img>`, karena tiap posisi foto menggambar tepat satu dari keduanya.
Angkanya tetap 10, 9, dan 1, jadi gerbang tidak merah saat foto pertama
diunggah.

## mutasi_check_foto.py

    python tools/verify/mutasi_check_foto.py dist <folder-kerja-sementara>

Membuktikan `check_foto.py` bisa MERAH, karena build hari ini tidak memuat satu
gambar pun. Pada salinan `dist` disuntikkan lima kerusakan: gambar tanpa alt,
alt kosong, tanpa width, tanpa height, dan berkas 600 KB di
`assets/foto/besar.jpg`. Ditambah satu kontrol positif: gambar yang sah harus
lolos dan terhitung sebagai "1 gambar diperiksa", supaya penjaga yang menolak
segalanya atau tidak membaca apa pun tidak tampak bagus.

Tiap mutasi diperiksa benar-benar mendarat dari disk sebelum gerbang dijalankan.
Skrip keluar dengan kode bukan nol kalau ada kasus yang tidak sesuai harapan.

`mutasi_check_static.py` mendapat satu kasus baru, "tambah gambar ke-11", untuk
membuktikan suku `<img>` pada hitungan `ph` benar-benar dihitung.

## check_keamanan_foto.py

    set -a; . ./.env; set +a
    python tools/verify/check_keamanan_foto.py

Mengikuti pola `check_keamanan.py`, tapi sasarannya tabel `foto` dan bucket
`foto`. Empat pembuktian tanpa login: update baris tabel, unggah berkas ke
bucket, hapus berkas bucket, lalu insert dan delete baris tabel. Semuanya harus
DITOLAK.

### Kontrol positif

Dua, dan yang pertama menghentikan skrip kalau gagal:

1. `GET /rest/v1/foto?limit=1&select=slot` harus HTTP 200. Baca publik memang
   diizinkan dengan sengaja, karena build mengambil seluruh barisnya.
2. Soal bucket. `GET /storage/v1/bucket/foto` dicoba lebih dulu, tapi endpoint
   metadata bucket menolak kunci anon dan menjawab `404 NoSuchBucket` walau
   bucketnya ada, jadi kegagalan di situ BUKAN tanda bucket hilang. Gantinya
   skrip mendaftar isi bucket lalu mengunduh berkas yang memang ada. Selama
   bucket masih kosong tidak ada berkas untuk diunduh, jadi kontrol positif
   kedua DILEWATI dan sebabnya dicetak.

Sudah diukur: `POST /storage/v1/object/list/<nama-bucket-yang-salah>` pun
menjawab HTTP 200 dan `[]`, jadi balasan 200 dari daftar isi TIDAK membuktikan
bucketnya ada. Karena itu daftar isi yang berhasil hanya dipakai sebagai bukti
lemah bahwa layanan storage bisa dihubungi dengan kunci anon, dan skrip
berhenti kalau daftar isi itu sendiri gagal.

### Tiga penolakan yang TIDAK membuktikan apa pun

Ketiganya sudah diukur terhadap project sungguhan, bukan dugaan:

1. Unggah `text/plain` ditolak `{"statusCode":"415","error":
   "invalid_mime_type"}`. Itu dari pembatasan jenis berkas bucket, bukan dari
   aturan akses baris. Pembuktian unggah karena itu memakai `image/jpeg`
   dengan isi JPEG minimal, dan badan balasannya diwajibkan memuat
   `row-level security`. Penolakan yang sah berbunyi `{"statusCode":"403",
   "error":"Unauthorized","message":"new row violates row-level security
   policy"}`.
2. `DELETE` berkas yang tidak ada dijawab `{"statusCode":"404","error":
   "not_found"}`, jadi izinnya kemungkinan belum sempat diperiksa. Pembuktian
   hapus hanya dijalankan terhadap berkas yang benar-benar terdaftar di bucket.
   Selama bucket kosong pembuktian itu DILEWATI dengan pesan yang menyebut
   sebabnya, dan itu BUKAN dihitung lulus.
3. `DELETE` ke storage dengan header `Content-Type: application/json` dan badan
   kosong dijawab `400 FastifyError "Body cannot be empty"`. Itu penolakan dari
   pemeriksaan bentuk permintaan. Karena itu `panggil()` menerima `jenis=None`
   untuk sengaja tidak mengirim header itu, dan pembuktian hapus mewajibkan
   badan balasannya menunjukkan penolakan izin.

### Hasil yang terukur hari ini

Kontrol positif 1 lulus (HTTP 200). Kontrol positif 2 dilewati, bucket kosong.
Update tabel, insert, dan delete baris ditolak HTTP 401 dengan kode Postgres
`42501`, yaitu izin ditolak di lapisan GRANT sebelum aturan akses baris
diperiksa. Unggah `image/jpeg` ditolak HTTP 400 dengan `statusCode 403` dan
`new row violates row-level security policy`. Pembuktian hapus berkas ditunda
sampai ada berkas sungguhan, yaitu setelah Task 9. Baris `hero` tetap
`alt: null`, dan `slot-palsu` tidak ada di tabel.

### Uji mutasi

Pada salinan di luar repo, empat cara merusak:

1. Ambang penilaian dibalik, `kode < 400` jadi `kode >= 400`: 4 masalah,
   exit 1.
2. Pembuktian insert disasarkan ke `GET /rest/v1/foto?limit=1&select=slot`
   yang memang diizinkan, sehingga cabang "DITERIMA" benar-benar dijalankan
   terhadap HTTP 200 sungguhan: 1 masalah, exit 1.
3. Kontrol positif dihapus lalu dijalankan dengan kunci sengaja salah: skrip
   mencetak empat baris `OK` padahal tidak menguji apa pun, TAPI tetap 1
   masalah dan exit 1, karena pemeriksaan badan balasan pada pembuktian unggah
   menangkap `Invalid Compact JWS`. Jadi pemeriksaan badan itu adalah jaring
   kedua yang berdiri sendiri.
4. Kontrol positif DAN pemeriksaan badan balasan dihapus, kunci sengaja salah:
   lima baris `OK`, `0 masalah`, exit 0. Inilah persis kegagalan Tahap 2a, dan
   inilah yang dicegah oleh kontrol positif.

Skrip repo yang utuh dijalankan dengan kunci sengaja salah berhenti di kontrol
positif pertama dengan `1 masalah` dan exit 1. Kode keluarnya diukur langsung,
tanpa pipa ke `head` atau `tail`, karena yang terbaca akan jadi status
perintah terakhir di pipa. Berkas repo diperiksa utuh dengan `cmp` sesudahnya.

### Yang BELUM dibuktikan skrip ini

Semua pembuktian di atas memakai kunci anon, yaitu TANPA sesi, jadi namanya
"tanpa login ditolak", bukan "ditolak". Varian "sudah login" butuh kata sandi
akun pemilik situs, yang tidak ada di repo dan tidak boleh ada di repo. Selain
itu, selama bucket masih kosong, dua hal belum terukur: bahwa bucket `foto`
benar-benar ada dan bisa dibaca publik, dan bahwa hapus berkas tanpa login
ditolak. Keduanya harus diukur ulang setelah Task 9 menaruh foto pertama.

## uji_telepon.mjs

    node tools/verify/uji_telepon.mjs src/lib/telepon.ts

Menguji `nomorE164()` di `src/lib/telepon.ts`. Kodenya diambil dari berkasnya
dengan regex, bukan ditulis ulang.

Kenapa uji ini ada: tautan `wa.me` yang salah bentuk GAGAL DIAM-DIAM. Situs ini
pernah tayang dengan `wa.me/085210009795`, yang tidak pernah sampai ke chat,
sementara alamatnya tetap menjawab HTTP 200 dan halamannya tetap terbuka.
Pembedanya hanya ada di isi halaman: nomor yang dikenali memberi og:title
"DH Makeup Studio", sedangkan yang tidak dikenali memberi "Share on WhatsApp",
sama seperti nomor ngawur. Tidak satu pun gerbang menangkapnya selama berhari
hari, dan untuk usaha yang jalannya lewat WhatsApp itu satu-satunya tombol yang
benar-benar penting.

Lima belas kasus: delapan bentuk yang biasa ditulis orang Indonesia, dan tujuh
yang harus ditolak. Diuji mutasi empat cara dan keempatnya merah.

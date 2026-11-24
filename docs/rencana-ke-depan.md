# Rencana ke depan, situs DH Makeup Studio

Terakhir diperbarui: 2026-11-24

Dokumen ini daftar pekerjaan, bukan janji jadwal. Urutannya bisa berubah, dan
memang sebaiknya berubah kalau ternyata ada yang lebih mendesak.

Tiap butir ditandai siapa yang mengerjakan:

- **(kode)** dikerjakan di repo ini
- **(kamu)** hanya bisa dikerjakan pemilik situs
- **(berdua)** butuh keduanya

---

## Sudah selesai

| Tahap | Isi | Keadaan |
|---|---|---|
| 1 | Situs lama dipindah ke Astro, GitHub, dan Vercel | Selesai, terbukti identik dengan versi lama |
| 2a | Tujuh nilai pengaturan bisa diubah lewat `/admin` | Selesai, terbukti ujung ke ujung |
| 2b-1 | Dua puluh posisi foto bisa diisi lewat `/admin` | Kode selesai, menunggu satu foto sungguhan |
| Menu | Halaman admin dibagi lima tab | Selesai, sudah tayang |

---

## Menunggu sekarang

### A. Unggah satu foto, untuk menutup Tahap 2b-1 **(kamu)**

Buka `/admin`, tab Beranda, isi Foto utama. Satu saja.

Ini bukan sekadar mengisi konten. Sampai itu terjadi, empat hal belum pernah
dibuktikan sekali pun: webhook kedua benar-benar memicu build, pengecilan
gambar bekerja pada berkas kamera sungguhan, foto benar-benar terbungkus ke
situs saat build, dan menghapus berkas tanpa login memang ditolak.

### B. SEO dasar **(kode)**

Open Graph supaya tautan yang kamu kirim di WhatsApp punya pratinjau,
`robots.txt`, `sitemap.xml`, canonical, dan schema LocalBusiness. Sedang
dikerjakan saat dokumen ini ditulis.

---

## Yang menurutku paling berdampak, dan tidak satu pun soal kode

### C. Google Business Profile **(kamu)**

Daftar gratis di `business.google.com`.

Untuk pencarian seperti "MUA Bandung" atau "makeup wedding Subang", Google
menampilkan peta berisi tiga nama di atas semua hasil situs. Situs sesempurna
apa pun kalah dari yang ada di peta itu. Yang menentukan peringkat di sana
terutama jumlah ulasan dan foto, dan kamu punya modal yang tidak semua orang
punya: klien yang sudah banyak.

### D. Kumpulkan dan pilih dua puluh foto **(kamu)**

Pekerjaan memilih, bukan pekerjaan teknis. Dua puluh posisi butuh dua puluh
foto, masing-masing dengan satu kalimat keterangan.

Situs makeup artist tanpa foto lebih lemah daripada Instagram biasa, karena
orang menilai perias dari hasil riasan.

### E. Domain sendiri **(berdua)**

Sekitar 150 sampai 200 ribu setahun untuk `.com`.

`dhmakeupwebsite.vercel.app` terbaca sebagai situs percobaan, dan sulit
disebutkan lisan. Kalau dibeli, ada satu baris konfigurasi yang harus diubah
supaya canonical dan sitemap ikut pindah. Kalau itu terlewat, Google melihat
dua situs berisi hal yang sama dan membagi nilainya.

---

## Tahap berikutnya, urut menurut manfaat

### Tahap 3: booking dan kalender **(kode)**

Formulir booking tersimpan ke basis data, acaranya masuk Google Calendar
otomatis, dan ada notifikasi saat ada booking baru.

Kunaikkan ke atas 2b-2 dan 2c setelah tahu kliennya sudah banyak. Yang
melelahkan orang dengan klien banyak biasanya mengatur jadwal, menagih DP, dan
menjawab pertanyaan yang sama berulang kali. Dua tahap di bawah ini tidak
menyentuh itu sama sekali.

### Tahap 2b-2: portofolio berjumlah bebas **(kode)**

Menambah, menghapus, dan mengurutkan foto portofolio sendiri, plus memilih gaya
riasannya untuk filter.

Sengaja ditunda. Setelah kamu mengisi sembilan bingkai yang ada, kamu akan tahu
sendiri apakah sembilan itu kurang. Kalau ternyata cukup, tahap ini bisa
ditunda lama.

### Tahap 2c: paket, harga, dan naskah **(kode)**

Mengubah daftar paket, harga, nama kategori, dan naskah halaman lewat `/admin`,
tanpa menyentuh kode.

Mendesak kalau harganya sering berubah. Kalau setahun sekali, tidak mendesak.

### Tahap 4: ulasan klien **(kode)**

Ulasan bisa ditambah lewat `/admin` dengan moderasi. Sekarang ulasan di situs
masih tertulis di kode.

### Fonnte: notifikasi WhatsApp **(berdua)**

Sudah diputuskan sejak awal akan disiapkan tapi tidak dinyalakan. Menyala
sendiri begitu tokennya diisi. Butuh akun Fonnte berbayar.

---

## Yang sengaja TIDAK dikerjakan, dan alasannya

**Mengukur jumlah pengunjung.** Sempat kusarankan, lalu kutarik setelah tahu
klien datang dari mulut ke mulut dan Instagram. Menghitung pengunjung situs
tidak akan memberi tahu apa pun yang mengubah keputusan.

**Blog atau artikel.** Butuh tulisan rutin untuk ada gunanya, dan itu pekerjaan
berat yang hasilnya lama. Untuk jasa lokal, Google Business Profile jauh lebih
cepat membuahkan hasil.

**Memakai kunci rahasia Supabase.** Seluruh rancangan sengaja tidak
memerlukannya. Keamanannya bersandar pada aturan akses baris, yang sudah diukur
bekerja, bukan pada menyembunyikan kunci.

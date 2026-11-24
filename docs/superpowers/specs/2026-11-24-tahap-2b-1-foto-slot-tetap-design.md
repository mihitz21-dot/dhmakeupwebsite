# Tahap 2b-1: Foto pada dua puluh posisi tetap

Tanggal: 2026-11-24
Status: disetujui, siap dibuatkan rencana implementasi

## 1. Konteks

Tahap 2a selesai dan terbukti ujung ke ujung: pemilik situs mengubah nilai di
halaman admin, Database Webhook memicu build ulang, dan nilainya tayang di
produksi. Penanda `dibangun` 04:02:06 lebih baru daripada waktu simpan 03:37:17,
cip `[NOMOR WHATSAPP]` hilang dari ketujuh halaman, dan tautan `wa.me` sungguhan
muncul di ketujuhnya.

Yang belum dikelola adalah foto. Dua puluh bingkai di tiga halaman masih berupa
placeholder, dan mengisinya berarti menyunting kode lalu push.

Pondasi untuk tahap ini sudah dipasang sejak Tahap 1: `PhotoSlot.astro` dibuat
menjadi satu-satunya tempat yang perlu diubah saat foto dikelola basis data.

## 2. Tujuan

Pemilik situs dapat mengisi dan mengganti foto pada kedua puluh posisi yang ada
lewat halaman admin, tanpa menyentuh git, dan perubahannya tayang di produksi
dalam waktu sekitar dua menit.

### Bukan tujuan Tahap 2b-1

Menambah atau menghapus posisi, mengurutkan ulang, dan mengubah kategori gaya
riasan tiap foto tidak ikut. Itu Tahap 2b-2.

Naskah halaman, nama kategori, paket, dan harga tidak ikut. Itu Tahap 2c.

Tahap ini sengaja tidak mengubah jumlah maupun tata letak. Perombakan tata letak
agar sanggup menampung jumlah yang berubah-ubah adalah bagian paling berisiko
dari pengelolaan foto, dan paling aman dikerjakan saat tidak ada variabel lain
yang bergerak.

## 3. Kedua puluh posisi

| Kunci slot | Halaman | Peran | Rasio sekarang |
|---|---|---|---|
| `hero` | Beranda | Foto utama di paling atas | 4:5 |
| `acara-01` | Beranda | Thumbnail kategori Wedding | 4:5, varian gelap |
| `acara-02` | Beranda | Thumbnail kategori Lamaran | 4:5, varian gelap |
| `acara-03` | Beranda | Thumbnail kategori Pre-wedding | 4:5, varian gelap |
| `acara-04` | Beranda | Thumbnail kategori Wisuda | 4:5, varian gelap |
| `acara-05` | Beranda | Thumbnail kategori Photoshoot | 4:5, varian gelap |
| `beranda-01` | Beranda | Karya pilihan, Rias pengantin | 4:6 |
| `beranda-02` | Beranda | Karya pilihan, Lamaran | 16:12 |
| `beranda-03` | Beranda | Karya pilihan, Natural | 16:12 |
| `beranda-04` | Beranda | Karya pilihan, Kids makeup | 4:6 |
| `plat-01` | Portofolio | Soft glam, resepsi malam | 4:6 |
| `plat-02` | Portofolio | Soft glam, kulit lembap | 16:12 |
| `plat-03` | Portofolio | Natural, akad pagi | 16:12 |
| `plat-04` | Portofolio | Adat, aksen emas | 4:6 |
| `plat-05` | Portofolio | Photoshoot, lampu studio | 4:6 |
| `plat-06` | Portofolio | Natural, cahaya matahari | 4:6 |
| `plat-07` | Portofolio | Kids makeup, pentas sekolah | 4:6 |
| `plat-08` | Portofolio | Soft glam, acara siang | 16:12 |
| `plat-09` | Portofolio | Di balik layar | 4:6 |
| `perias` | Tentang | Foto perias | 4:5 |

Kolom rasio di atas adalah keadaan sekarang, bukan aturan. Setelah tahap ini
rasio dipilih dari bentuk asli foto yang diunggah.

## 4. Dua taksonomi yang berbeda

Situs ini memakai dua pengelompokan yang tidak sama, dan itu disengaja:

- **Jenis acara**, di beranda: Wedding, Lamaran, Pre-wedding, Wisuda, Photoshoot.
- **Gaya riasan**, filter di portofolio: Soft glam, Natural, Adat, Kids makeup,
  Photoshoot, Di balik layar.

Hanya "Photoshoot" muncul di keduanya.

Gaya riasan terikat keras pada `src/scripts/site.js`, yang membaca atribut
`data-look` dan termasuk berkas yang tidak boleh disunting karena wajib tetap
identik byte demi byte dengan situs lama. Karena itu daftar gaya riasan tidak
dapat diubah di tahap ini, dan atribut `data-look` tetap tertulis di halaman.

## 5. Keputusan dan alasannya

| Keputusan | Alasan |
|---|---|
| Foto diunduh saat build dan ikut diterbitkan | Pengunjung mengambilnya dari Vercel, tidak pernah menyentuh Supabase. Tier gratis Supabase dijeda setelah tujuh hari tanpa aktivitas; kalau foto diambil saat kunjungan, seluruh foto berubah jadi kotak kosong saat itu terjadi |
| Dikecilkan di peramban sebelum diunggah | Unggah tetap berhasil walau sinyal lemah, kuota 1 GB tidak cepat habis, dan situs ringan untuk pengunjung berkuota terbatas |
| Satu tabel berkunci `slot`, dua puluh baris tetap | Tiap posisi punya alamat pasti, sehingga mengganti foto beranda tidak mungkin tanpa sengaja mengubah foto portofolio |
| Rasio dipilih dari bentuk asli foto | Pemilik situs tidak perlu memikirkannya, dan foto tegak tidak pernah dipaksa masuk bingkai melebar lalu terpotong |
| Build digagalkan kalau sebuah foto gagal diunduh | Vercel tetap menyajikan deployment sebelumnya. Yang gagal hanya pembaruan, dan itu terlihat di log, bukan muncul sebagai lubang di halaman yang baru disadari seminggu kemudian |
| Teks alt wajib diisi | Pembaca layar membacakannya untuk orang yang tidak bisa melihat foto, dan mesin pencari memakainya untuk memahami isi halaman |
| Satu foto disimpan sendiri-sendiri | Kesalahan pada satu foto tidak merembet ke sembilan belas lainnya |

## 6. Skema basis data

```sql
create table foto (
  slot        text primary key,
  berkas      text,
  alt         text,
  lebar       int,
  tinggi      int,
  diperbarui  timestamptz not null default now()
);
```

`berkas` bernilai `null` berarti posisi itu belum diisi, dan bingkai placeholder
tetap tampil. Itu melanjutkan aturan yang sudah berlaku untuk kontak di Tahap
2a: situs tidak pernah rusak hanya karena ada yang belum diisi.

`lebar` dan `tinggi` adalah ukuran foto setelah dikecilkan. Dua gunanya: memilih
bingkai yang paling mendekati bentuk aslinya, dan mengisi atribut `width` dan
`height` pada tag gambar supaya ruangnya dipesan lebih dulu dan tata letak tidak
melompat saat foto dimuat.

Bingkai dipilih dengan membandingkan `lebar / tinggi` terhadap ketiga rasio yang
tersedia, lalu mengambil yang selisihnya terkecil: 4:5 bernilai 0,8, 4:6 bernilai
0,667, dan 16:12 bernilai 1,333.

Foto persegi bernilai 1,0, dan yang terdekat adalah 4:5 dengan jarak 0,200.
Draf pertama spec ini menulis 16:12, dan itu salah hitung: jaraknya 0,333, sama
persis dengan jarak ke 4:6. Aturannya ditulis eksplisit beserta angkanya supaya
kekeliruan semacam itu bisa diperiksa, bukan dipercaya.

Dua puluh baris dibuat sekali lewat SQL dengan `berkas` bernilai `null`, dan
tidak pernah ditambah maupun dihapus di tahap ini.

Satu pemicu memperbarui kolom `diperbarui` setiap baris berubah, sama seperti
tabel `pengaturan`.

## 7. Penyimpanan berkas

Bucket Supabase Storage bernama `foto`, boleh dibaca publik.

Nama berkas memakai kunci slot ditambah penanda waktu, misalnya
`plat-07-1764038400000.jpg`. Penanda waktu mencegah peramban dan CDN menyajikan
foto lama setelah diganti.

Berkas lama dihapus saat posisi yang sama diisi ulang, supaya kuota tidak
terkikis oleh berkas yang tidak lagi dirujuk siapa pun.

## 8. Keamanan

Pola yang sama dengan tabel `pengaturan`, yang sudah terbukti di Tahap 2a Task 7.

Tabel `foto`:

```sql
grant select on public.foto to anon;
grant select, update on public.foto to authenticated;

alter table foto enable row level security;

create policy "publik boleh baca" on foto
  for select using (true);

create policy "login boleh ubah" on foto
  for update to authenticated using (true) with check (true);
```

Tidak ada kebijakan insert maupun delete, sehingga keduanya ditolak secara
bawaan.

Bucket `foto`: baca publik, sedangkan unggah, ganti, dan hapus hanya untuk
`authenticated`.

Membaca boleh publik karena proses build memang perlu mengunduhnya, dan fotonya
memang akan tampil di situs publik.

## 9. Pengecilan di peramban

Sebelum dikirim, peramban menggambar ulang foto ke kanvas dan menyimpannya
sebagai JPEG:

- sisi terpanjang dibatasi 1600 piksel, foto yang sudah lebih kecil dibiarkan
- mutu 0,82
- hasilnya biasanya 200 sampai 400 KB dari berkas kamera 3 sampai 8 MB

Kalau hasil pengecilan ternyata masih lebih besar dari 500 KB, unggah ditolak
dengan pesan yang menyebut ukurannya, bukan diteruskan diam-diam.

Berkas yang bukan gambar, atau gambar yang gagal dibaca peramban, ditolak dengan
pesan sebab sebelum apa pun dikirim.

## 10. Pengambilan saat build

Satu langkah sebelum build mengunduh seluruh baris `foto` yang `berkas`-nya
tidak null ke `public/assets/foto/`. Setelah itu Astro membangun seperti biasa.

Kalau sebuah unduhan gagal, langkah ini melempar galat sehingga build gagal.
Jangan melanjutkan dengan foto yang hilang.

## 11. Perubahan kode

`PhotoSlot.astro` menerima prop `slot` sebagai ganti `file` dan `ada`, mencari
sendiri data posisi itu, memutuskan menggambar foto atau placeholder, dan
memilih bingkai terdekat dari `lebar` dan `tinggi`.

Kedua puluh pemanggilan di `index.astro`, `portofolio.astro`, dan
`tentang.astro` berubah bentuknya menjadi seperti:

```astro
<PhotoSlot slot="plat-07" no="07" label="Kids makeup" />
```

Prop `no`, `label`, `varian`, dan `prioritas` tetap ditulis di halaman, karena
keempatnya milik desain posisi, bukan milik fotonya. `varian` menentukan warna
placeholder terang atau gelap sesuai latar tempatnya berdiri, dan `prioritas`
menandai foto utama supaya dimuat lebih dulu. Prop `rasio` tidak lagi ditulis di
halaman karena sekarang dihitung dari ukuran foto, dan prop `file` serta `ada`
hilang sepenuhnya karena digantikan `slot`.

Atribut `data-look` pada elemen `figure` di portofolio TIDAK diubah, karena
`site.js` bergantung padanya dan berkas itu tidak boleh disunting.

`src/styles/site.css` dan `src/scripts/site.js` tidak disentuh sama sekali.

## 12. Halaman admin

Bagian kedua di bawah formulir pengaturan, berisi kedua puluh posisi yang
dikelompokkan menurut tempatnya: Beranda, Kategori acara, Portofolio, Tentang.

Tiap baris memuat gambar kecil yang terpasang sekarang atau penanda belum diisi,
nama posisi dalam bahasa manusia seperti "Portofolio 07, Kids makeup", tombol
pilih berkas, kolom teks alt, dan tombol hapus.

Keadaan yang harus punya tampilannya sendiri:

| Keadaan | Yang tampil |
|---|---|
| Memuat daftar | Penanda sedang mengambil data foto |
| Siap | Dua puluh baris dengan keadaannya masing-masing |
| Berkas ditolak | Pesan sebab: bukan gambar, gagal dibaca, atau terlalu besar |
| Mengecilkan | Penanda sedang menyiapkan foto |
| Mengunggah | Tombol baris itu nonaktif, penanda sedang mengunggah |
| Tersimpan | Keterangan situs sedang dibangun ulang |
| Sudah tayang | Penanda build berubah dan lebih baru dari waktu simpan |
| Gagal | Pesan sebab dan cara mencoba lagi |

Teks alt wajib diisi. Unggah tanpa teks alt ditolak sebelum berkas dikirim.

Halaman ini terikat aturan yang sama dengan seluruh situs: label terlihat, dapat
dioperasikan dengan papan ketik, punya penanda fokus, target sentuh minimal 44
piksel, dan kontras memenuhi WCAG AA.

## 13. Build ulang

Database Webhook kedua pada tabel `foto`, dipicu hanya oleh event UPDATE,
memanggil Deploy Hook Vercel yang sama.

Pemantauan di halaman admin memakai mekanisme yang sudah ada: membandingkan
penanda `dibangun` dengan kolom `diperbarui`, dan menyatakan tayang hanya kalau
penandanya lebih baru. Perbandingan sekadar berubah-tidak-berubah tidak cukup,
karena build yang sudah berjalan sebelum penyimpanan akan mengubah penandanya
tanpa membawa perubahannya.

## 14. Syarat lulus

Dibuktikan dengan dijalankan, bukan diklaim.

### Invarian bingkai diperbaiki, bukan dipensiunkan

`check_static` sekarang menghitung bingkai placeholder: beranda 10, portofolio
9, tentang 1. Begitu foto pertama diunggah, hitungan itu merah.

Yang diperbaiki adalah cara menghitungnya, bukan angkanya: **bingkai placeholder
ditambah gambar**. Angkanya tetap 10, 9, dan 1 apa pun isinya, dan artinya lebih
kuat dari sebelumnya karena posisi yang hilang dari halaman tetap ketahuan,
entah posisi itu sedang berisi foto atau masih kosong.

Ini berbeda dari invarian jumlah kata di Tahap 2a, yang memang dipensiunkan
karena angkanya tidak punya bentuk yang tetap bermakna setelah data masuk.

### Penjaga baru, ketiganya wajib diuji mutasi

1. Setiap gambar punya teks alt yang tidak kosong.
2. Setiap gambar punya atribut `width` dan `height`.
3. Tidak ada berkas gambar di hasil build yang lebih besar dari 500 KB.

Ketiganya harus terbukti bisa merah. Penjaga yang tidak pernah bisa gagal lebih
buruk daripada tidak ada penjaga, karena memberi rasa aman yang palsu.

### Pembuktian keamanan, keempatnya wajib dijalankan

Didahului kontrol positif: membaca tabel `foto` dan mengunduh sebuah berkas dari
bucket dengan kunci anon harus BERHASIL. Kalau kontrol positif gagal, skrip
berhenti dan tidak menjalankan sisanya, karena penolakan yang datang dari kunci
yang tidak sah tidak membuktikan apa pun.

1. Mengubah tabel `foto` tanpa login ditolak.
2. Mengunggah berkas ke bucket tanpa login ditolak.
3. Menghapus berkas dari bucket tanpa login ditolak.
4. Insert dan delete pada tabel `foto` tanpa login ditolak.

### Pembuktian rantai lengkap

Mengunggah satu foto lewat halaman admin membuat foto itu tampil di
https://dhmakeupwebsite.vercel.app, dan penanda build menjadi lebih baru
daripada waktu penyimpanan. Diukur ujung ke ujung.

### Pembuktian kegagalan yang aman

Build dengan satu baris `foto` yang menunjuk berkas tidak ada harus gagal, bukan
menghasilkan situs dengan gambar rusak.

### Gerbang Tahap 1 dan 2a tetap berlaku

`check_browser`, `check_interactions`, `check_keamanan`, `uji_bersih`,
`uji_pantau`, dan `mutasi_check_static` semuanya tetap hijau.

Filter portofolio tetap bekerja: menekan "Kids makeup" tetap menyisakan foto
yang benar, dan hitungannya tetap akurat.

## 15. Risiko

**Kuota Storage tier gratis 1 GB.** Dengan pengecilan ke sekitar 300 KB, dua
puluh posisi memakai sekitar 6 MB. Jauh dari batas. Risikonya baru nyata di
Tahap 2b-2 saat jumlah foto bebas bertambah.

**Build jadi lebih lama.** Dua puluh unduhan menambah beberapa detik. Di Tahap
2b-2 dengan jumlah foto yang bebas, ini perlu ditinjau ulang.

**Pengecilan di peramban bergantung pada kanvas.** Foto yang sangat besar bisa
gagal digambar di perangkat dengan memori terbatas. Karena itu kegagalan membaca
gambar harus punya pesan sendiri, bukan diam.

**Metadata orientasi foto.** Foto dari ponsel sering menyimpan arah putar di
metadata. Peramban modern menghormatinya saat menggambar ke kanvas, tapi ini
harus diperiksa dengan foto sungguhan dari ponsel, bukan diasumsikan.

## 16. Setelah Tahap 2b-1

| Tahap | Isi |
|---|---|
| 2b-2 | Portofolio dan deretan beranda berjumlah bebas: tambah, hapus, urutkan, pilih gaya riasan |
| 2c | Paket, harga, nama kategori, dan naskah halaman |
| 3 | Booking tersimpan, notifikasi email, acara otomatis di Google Calendar |
| 4 | Ulasan klien dengan moderasi |
| Fonnte | Saluran notifikasi opsional, menyala sendiri begitu tokennya diisi |

# Tahap 2a: Supabase, login, admin, dan pengaturan situs

Tanggal: 2026-11-24
Status: disetujui, siap dibuatkan rencana implementasi

## 1. Konteks

Tahap 1 selesai. Situs berupa project Astro statis berisi 7 halaman, terbit di
https://dhmakeupwebsite.vercel.app, dan terbukti identik dengan versi HTML lama:
teks sama di ketujuh halaman, tangkapan layar identik byte demi byte pada lebar
390 dan 1440, nol tautan mati, nol error konsol, kontras AA lolos.

Dua pondasi sengaja disiapkan di Tahap 1 untuk tahap ini:

- `getSite()` di `src/data/site.ts` sudah `async`, sehingga isinya bisa diganti
  pengambilan dari Supabase tanpa menyunting satu pun dari 7 halaman.
- `PhotoSlot.astro` menjadi satu-satunya tempat yang perlu diubah saat foto
  dikelola basis data. Itu Tahap 2b, bukan tahap ini.

Saat ini 24 titik kontak di 7 halaman masih berupa cip placeholder, dan
mengubahnya berarti menyunting kode lalu push.

## 2. Tujuan Tahap 2a

Tujuh nilai pengaturan dapat diubah pemilik situs lewat halaman admin di
peramban, tanpa menyentuh git, dan perubahannya tayang di situs produksi dalam
waktu sekitar dua menit.

Tujuh nilai itu: nomor WhatsApp, username Instagram, alamat email, jam balas,
nominal DP, kebijakan pembatalan, dan daftar area layanan.

### Bukan tujuan Tahap 2a

Foto, paket, harga, dan naskah halaman tidak ikut. Booking, ulasan, kalender,
dan notifikasi tidak ikut. Kunci service_role tidak dipakai sama sekali.

Tahap ini sengaja dibuat sekecil mungkin. Kalau rantai Supabase ke admin ke
build ulang bermasalah, lebih baik ketahuan saat yang dipertaruhkan hanya satu
nomor telepon, bukan saat 20 foto dan seluruh naskah sudah masuk.

## 3. Keputusan dan alasannya

| Keputusan | Alasan |
|---|---|
| Situs tetap dibangun statis, data diambil saat build | Pengunjung tidak pernah menyentuh basis data. Halaman tetap cepat dan tidak pernah kosong walau Supabase tier gratis sedang dijeda |
| Satu tabel satu baris, dipaksa `check (id = 1)` | Tanpa itu suatu hari akan ada dua baris pengaturan dan tidak ada yang tahu mana yang dipakai |
| Pendaftaran publik dimatikan, akun dibuat manual | Supabase mengizinkan pendaftaran secara bawaan. Tanpa dimatikan, orang asing bisa mendaftar, lolos pemeriksaan "sudah login", lalu mengganti nomor WhatsApp di situs dengan nomornya sendiri |
| Build ulang dipicu Database Webhook, bukan dari peramban | Alamat Deploy Hook bersifat rahasia. Kalau dipanggil dari peramban, alamatnya terbaca siapa pun dan orang bisa memicu build berulang-ulang |
| Penanda build memakai waktu, bukan commit SHA | Build yang dipicu CMS memakai commit yang sama, sehingga SHA tidak berubah dan penandanya tidak berguna |
| Build sengaja digagalkan kalau Supabase tidak terjangkau | Vercel tetap menyajikan deployment sebelumnya, sehingga situs yang hidup tidak pernah kehilangan nomor kontaknya. Yang gagal hanya pembaruan, dan itu terlihat jelas di log |
| Login memakai email dan kata sandi | Dipilih pemilik situs. Lebih cepat dipakai daripada tautan ajaib, dan karena pendaftaran dimatikan, hanya ada satu akun |

## 4. Skema basis data

```sql
create table pengaturan (
  id              int primary key default 1 check (id = 1),
  whatsapp        text,
  instagram       text,
  email           text,
  jam_operasional text,
  dp              text,
  pembatalan      text,
  area            text[] not null default '{}',
  diperbarui      timestamptz not null default now()
);
```

Nilai `null` berarti belum diisi. Itu melanjutkan aturan yang sudah berlaku di
Tahap 1: komponen `Kontak.astro` menggambar cip placeholder saat nilainya `null`
dan tautan sungguhan saat terisi.

Satu pemicu memperbarui kolom `diperbarui` setiap baris berubah.

## 5. Keamanan

```sql
-- Izin tabel. Ini LAPIS TERPISAH dari aturan akses baris, dan wajib ada.
-- Aturan akses baris menentukan baris mana yang boleh disentuh, sedangkan
-- GRANT menentukan boleh menyentuh tabelnya sama sekali atau tidak. Tanpa
-- baris ini, proses build gagal membaca dan situs tidak bisa dibangun.
grant select on public.pengaturan to anon;
grant select, update on public.pengaturan to authenticated;

alter table pengaturan enable row level security;

create policy "publik boleh baca" on pengaturan
  for select using (true);

create policy "login boleh ubah" on pengaturan
  for update to authenticated using (true) with check (true);
```

Tidak ada kebijakan untuk insert maupun delete, sehingga keduanya ditolak secara
bawaan. Baris tunggalnya dibuat sekali lewat SQL dan tidak pernah ditambah atau
dihapus.

Membaca boleh publik karena proses build memang perlu mengambil nilainya, dan
isinya memang akan tampil di situs publik.

**Pendaftaran publik wajib dimatikan** di Authentication, dan akun pemilik dibuat
manual dari dashboard. Tanpa langkah itu, kebijakan `to authenticated` tidak
berarti apa-apa.

## 6. Mekanisme build ulang

Database Webhook di Supabase, dipicu hanya oleh event UPDATE pada tabel
`pengaturan`, memanggil Deploy Hook Vercel lewat HTTP POST. Alamat Deploy Hook
tersimpan di sisi server Supabase dan tidak pernah sampai ke peramban.

## 7. Penanda build

`Base.astro` menyisipkan satu meta pada setiap halaman:

```html
<meta name="dibangun" content="2026-11-24T10:33:00.000Z">
```

Nilainya waktu saat build berjalan. Halaman admin menengok alamat situs secara
berkala setelah menyimpan, sampai nilai itu berubah, lalu memberi tahu bahwa
perubahan sudah tayang. Tanpa penanda ini pemilik situs hanya bisa menebak
sambil menyegarkan halaman.

Penanda ini aman terhadap seluruh gerbang: meta adalah tag sehingga tidak
terhitung sebagai kata, dan tidak tampil sehingga perbandingan teks maupun
tangkapan layar tidak terpengaruh.

## 8. Perubahan kode

Hanya isi `getSite()` yang berubah, dari mengembalikan nilai literal menjadi
mengambil satu baris dari Supabase. Ketujuh halaman tidak disentuh sama sekali.

Nilai `nav`, `paket`, dan `tambahan` tetap literal di kode. Itu Tahap 2c.

Kalau pengambilan gagal, fungsi melempar error sehingga build gagal. Jangan
mengembalikan nilai kosong sebagai cadangan.

## 9. Halaman admin

Satu halaman di `/admin`, dirender statis, dengan bagian interaktif berjalan di
peramban. Seluruh keadaan berikut harus punya tampilannya sendiri:

| Keadaan | Yang tampil |
|---|---|
| Memuat | Penanda sedang memeriksa sesi |
| Belum login | Formulir email dan kata sandi |
| Login gagal | Pesan sebab, bukan sekadar "gagal" |
| Memuat data | Penanda sedang mengambil pengaturan |
| Siap | Formulir tujuh kolom, terisi nilai sekarang |
| Menyimpan | Tombol nonaktif, penanda sedang menyimpan |
| Tersimpan | Keterangan situs sedang dibangun ulang, sekitar dua menit |
| Sudah tayang | Penanda build berubah, perubahan terbukti tayang |
| Gagal menyimpan | Pesan sebab dan cara mencoba lagi |

Halaman ini terikat aturan yang sama dengan seluruh situs: setiap kolom punya
label terlihat, dapat dioperasikan dengan papan ketik, punya penanda fokus,
target sentuh minimal 44 piksel, dan kontras memenuhi WCAG AA.

Halaman `/admin` tidak dimasukkan ke navigasi mana pun dan diberi
`<meta name="robots" content="noindex">`.

## 10. Environment variables

Dua nilai, keduanya memang dirancang publik dan akan ikut terbaca di kode
halaman:

    PUBLIC_SUPABASE_URL
    PUBLIC_SUPABASE_ANON_KEY

Dipasang di berkas `.env` lokal, yang sudah diabaikan git, dan di Environment
Variables Vercel untuk Production dan Preview.

Kunci service_role tidak dipakai di tahap ini dan tidak boleh dipasang di mana
pun.

## 11. Syarat lulus

Dibuktikan dengan dijalankan, bukan diklaim.

### Gerbang Tahap 1 tetap berlaku

Dengan tabel `pengaturan` masih kosong, seluruh gerbang Tahap 1 harus tetap
hijau: `check_static` 0, `check_browser` 0, `check_interactions` 0 masalah dan 0
error konsol, serta `compare` 0 halaman berbeda.

**Catatan penting tentang invarian jumlah kata.** Angka 637, 484, 704, 614, 310,
518, dan 325 hanya berlaku selama `pengaturan` masih kosong. Begitu nomor
WhatsApp diisi, cip placeholder berubah jadi tautan dan jumlah katanya bergeser.
Itu perubahan yang diinginkan, bukan regresi.

Karena itu invarian jumlah kata dipensiunkan setelah data sungguhan masuk.
Tugasnya sudah selesai, yaitu membuktikan porting Tahap 1 tidak mengubah apa pun.
Penjaga yang tersisa setelah itu adalah `check_browser`, `check_interactions`,
dan pemeriksaan struktur.

### Pembuktian keamanan, ketiganya wajib dijalankan

1. Permintaan update ke tabel `pengaturan` tanpa login ditolak, dibuktikan
   dengan memanggil REST API Supabase memakai kunci anon tanpa sesi.
2. Pendaftaran akun baru ditolak, dibuktikan dengan memanggil endpoint signup
   dan menerima penolakan.
3. Permintaan insert dan delete ke tabel `pengaturan` ditolak walau sudah login,
   dibuktikan dengan memanggilnya memakai sesi yang sah.

### Pembuktian rantai lengkap

Mengubah satu nilai di halaman admin membuat nilai itu tayang di
https://dhmakeupwebsite.vercel.app dalam waktu wajar, dan penanda build berubah.
Diukur ujung ke ujung, bukan per bagian.

### Pembuktian kegagalan yang aman

Build dengan `PUBLIC_SUPABASE_URL` yang sengaja salah harus gagal, bukan
menghasilkan situs dengan kontak kosong.

## 12. Risiko

**Tier gratis Supabase dijeda setelah tujuh hari tanpa aktivitas.** Akibatnya
build berikutnya gagal dan login admin gagal sampai project dibangunkan. Situs
yang hidup tidak terpengaruh karena Vercel tetap menyajikan deployment
sebelumnya. Ini konsekuensi yang disengaja, bukan cacat.

**Halaman `/admin` dapat diakses siapa pun yang tahu alamatnya.** Itu wajar untuk
situs statis. Pengamanannya ada pada login dan aturan akses baris, bukan pada
menyembunyikan alamat. Karena itu ketiga pembuktian keamanan di atas tidak boleh
dilewati.

**Alamat Deploy Hook bersifat rahasia.** Siapa pun yang memilikinya dapat memicu
build berulang-ulang. Alamat itu hanya hidup di konfigurasi Supabase, tidak di
repo, tidak di peramban, dan tidak di percakapan mana pun.

## 13. Setelah Tahap 2a

| Tahap | Isi |
|---|---|
| 2b | Foto portofolio: unggah, urutan, kategori, teks alt |
| 2c | Paket, harga, dan naskah halaman |
| 3 | Booking tersimpan, notifikasi email, acara otomatis di Google Calendar |
| 4 | Ulasan klien dengan moderasi |
| Fonnte | Saluran notifikasi opsional, menyala sendiri begitu tokennya diisi |

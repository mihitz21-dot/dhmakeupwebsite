# Tahap 1: Port ke Astro, repo GitHub, deploy Vercel

Tanggal: 2026-11-22
Status: disetujui, siap dibuatkan rencana implementasi

## 1. Konteks

Situs DH Makeup Studio saat ini berupa 7 berkas HTML statis di
`D:\Imam\Claude\Website\Dh Makeup New`, ditambah `assets/site.css` dan
`assets/site.js`. Total 2.935 baris, 160 KB. Tidak ada build step, tidak ada
`package.json`, dan **belum berupa repo git sama sekali**, sehingga tidak ada
riwayat perubahan dan tidak ada cara membatalkan kesalahan.

Isi situs sudah melewati penyaringan antislop: angka dan testimoni karangan
sudah dihapus, klaim layanan yang tidak benar sudah dibuang, dan kontak masih
berupa placeholder eksplisit. Ada 20 slot foto kosong yang menunggu foto asli.

Selain itu masih ada 7 folder sisa dari Stitch (`about_lun_a_makeup_artist`,
`contact_lun_a_makeup_artist`, `lun_a_makeup_artist_official_website`,
`packages_lun_a_makeup_artist`, `portfolio_lun_a_makeup_artist`,
`services_lun_a_makeup_artist`, `testimonials_lun_a_makeup_artist`) yang sudah
digantikan dan tidak dipakai lagi.

## 2. Tujuan Tahap 1

1. Situs punya riwayat perubahan di GitHub.
2. Situs terbit otomatis setiap kali ada push.
3. Struktur kodenya siap menerima CMS di Tahap 2 tanpa membongkar ulang
   ketujuh halaman.

### Bukan tujuan Tahap 1

Tidak ada Supabase, login, admin, atau database. Tidak ada perubahan tampilan.
Tidak ada foto baru. Kontak tetap placeholder. Tidak ada domain khusus.

## 3. Keputusan dan alasannya

| Keputusan | Alasan |
|---|---|
| Astro, bukan Next.js atau HTML polos | Berkas `.astro` isinya HTML biasa, jadi 7 halaman pindah hampir apa adanya dan CSS tidak disentuh. Galeri dirender di server sehingga foto ada di dalam HTML, bukan diambil JavaScript setelah halaman terbuka. Untuk situs yang seluruh jualannya foto, galeri yang tidak terbaca mesin pencari adalah kegagalan serius |
| Port dikerjakan sekarang, bukan setelah deploy | Kalau HTML mentah di-deploy dulu lalu di-port kemudian, konfigurasi Vercel dikerjakan dua kali dan deploy pertama terbuang |
| Situs tetap dibangun statis, bahkan nanti saat memakai Supabase | Pengunjung tidak pernah menyentuh database. Halaman tetap cepat dan tidak pernah kosong walau Supabase tier gratis sedang dijeda setelah 7 hari tanpa aktivitas |
| Semua konfigurasi git memakai `--local` | Di device ini ada repo lain. Konfigurasi global saat ini hanya berisi `core.editor`, tanpa identitas dan tanpa credential helper, jadi tidak ada yang perlu diubah secara global |
| Folder dipindah ke path tanpa spasi | Path sekarang mengandung spasi di dua nama folder. Setelah ada npm, build script, dan credential helper, spasi jadi sumber masalah berulang yang sulit dilacak |

## 4. Struktur repo

Lokasi baru: `D:\Imam\Projects\dhmakeupwebsite`, menyamai nama repo.

```
dhmakeupwebsite/
├─ docs/superpowers/specs/      spec, termasuk berkas ini
├─ public/
│  └─ foto/                     foto asli, plus panduan pengisian
├─ src/
│  ├─ layouts/Base.astro
│  ├─ components/
│  │  ├─ Masthead.astro
│  │  ├─ NavSheet.astro
│  │  ├─ Footer.astro
│  │  ├─ Plate.astro
│  │  ├─ PhotoSlot.astro
│  │  └─ Kontak.astro
│  ├─ data/site.ts
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ layanan.astro
│  │  ├─ paket.astro
│  │  ├─ portofolio.astro
│  │  ├─ tentang.astro
│  │  ├─ ulasan.astro
│  │  └─ kontak.astro
│  ├─ styles/site.css           dipindah apa adanya
│  └─ scripts/site.js           dipindah apa adanya
├─ astro.config.mjs
├─ package.json
└─ .gitignore
```

Tujuh folder Stitch lama tidak ikut ke repo baru. `bridal_beauty_atelier/DESIGN.md`
ikut, disimpan sebagai `docs/DESIGN.md`, karena itu arah desain yang dirujuk
seluruh CSS.

## 5. Duplikasi yang dihilangkan

Hasil pengukuran pada berkas yang ada sekarang:

| Terduplikasi | Jumlah sekarang | Setelah port |
|---|---|---|
| Masthead | 7 salinan | 1 komponen |
| Nav sheet ponsel | 7 salinan | 1 komponen |
| Footer | 7 salinan | 1 komponen |
| `[NOMOR WHATSAPP]` | 8 titik | 1 nilai |
| `[USERNAME IG]` | 8 titik | 1 nilai |
| `[ALAMAT EMAIL]` | 8 titik | 1 nilai |
| Harga tiap paket | 3 titik per paket | 1 daftar |
| "Bandung, Subang, Cimahi, Jakarta" | 10 titik | 1 nilai |
| Bingkai foto | 20 blok manual | 1 komponen |

## 6. Sumber data

`src/data/site.ts` menjadi satu-satunya sumber kebenaran.

```ts
export async function getSite() {
  return {
    nama: "DH Makeup Studio",
    area: ["Bandung", "Subang", "Cimahi", "Jakarta"],
    kontak: {
      whatsapp: null,
      instagram: null,
      email: null,
      jamOperasional: null,
    },
    kebijakan: {
      dp: null,
      pembatalan: null,
    },
    nav: [
      { href: "/",           label: "Beranda"    },
      { href: "/layanan",    label: "Layanan"    },
      { href: "/paket",      label: "Paket"      },
      { href: "/portofolio", label: "Portofolio" },
      { href: "/tentang",    label: "Tentang"    },
      { href: "/ulasan",     label: "Ulasan"     },
      { href: "/kontak",     label: "Kontak"     },
    ],
    paket: [
      {
        slug: "essential",
        nama: "Essential",
        harga: 1_500_000,
        untuk: "Untuk acara sekali jalan: wisuda, lamaran kecil, sesi foto keluarga.",
        penanda: "Tanpa touch up di lokasi",
        isi: ["Makeup dan hairdo atau penataan hijab", "..."],
      },
      // signature, bridal
    ],
    tambahan: [
      // ibu pengantin, bridesmaid, groom, trial
    ],
  };
}
```

Potongan di atas adalah sketsa bentuk, bukan isi lengkap. Nilai sebenarnya
untuk `paket` dan `tambahan` disalin **apa adanya** dari `index.html`,
`paket.html`, dan `kontak.html` yang ada sekarang. Harga, nama paket, penanda
jumlah touch up, dan daftar isinya tidak diubah sedikit pun pada Tahap 1.

### Dua aturan yang mengikat

**`async` sejak awal.** Tiap halaman memanggil `const site = await getSite()`.
Di Tahap 2 isi fungsi itu diganti menjadi pengambilan dari Supabase saat build,
dan tidak satu pun dari 7 halaman perlu disunting. Tanpa `async` sejak awal,
Tahap 2 berarti membongkar ketujuh halaman satu per satu.

**`null` berarti belum diisi.** Komponen `Kontak.astro` membaca nilainya
sendiri. Jika `null`, ia menggambar cip placeholder `[NOMOR WHATSAPP]` dan
bukan tautan. Jika terisi, ia menjadi tautan `wa.me` sungguhan. Ini menutup
lubang yang ada sekarang: mengisi nomor berarti menyunting 8 titik sekaligus
mengubah baris mati di halaman Kontak menjadi tautan, dan satu di antaranya
gampang tertinggal.

## 7. Kontrak komponen

| Komponen | Props | Perilaku |
|---|---|---|
| `Base.astro` | `judul`, `deskripsi`, `halaman` | Membungkus `<html>`, `<head>`, masthead, nav sheet, footer, dan import `site.css` serta `site.js`. Skrip pengaman reveal tetap inline di `<head>` memakai `is:inline` |
| `Masthead.astro` | `halaman` | Menu dibangun dari `site.nav`. `aria-current="page"` dihitung dari props, bukan ditulis tangan. Sekarang ditulis tangan di 14 tempat dan bisa melenceng |
| `NavSheet.astro` | `halaman` | Sama, untuk lembar navigasi ponsel |
| `Footer.astro` | tanpa props | Membaca `site.kontak` dan `site.nav` |
| `Plate.astro` | `no`, `label` | Motif nomor plat beserta garis emasnya |
| `PhotoSlot.astro` | `no`, `label`, `berkas`, `varian`, `rasio` | `varian` bernilai `terang` atau `gelap`. `rasio` bernilai `4:5`, `4:6`, atau `16:12`, menyamai tiga rasio yang dipakai sekarang. Menggambar bingkai `.ph` jika `berkas` belum ada, atau `<img>` lengkap dengan `width`, `height`, `loading`, dan `decoding` jika sudah ada. **Inilah jembatan ke Tahap 2b**: satu berkas ini diubah, 20 bingkai ikut berubah |
| `Kontak.astro` | `jenis` | `whatsapp`, `instagram`, atau `email`. Memutuskan sendiri antara cip placeholder atau tautan sungguhan |

`site.paket` menggerakkan tiga tempat sekaligus: kartu paket di beranda, kartu
di halaman Paket, dan pilihan dropdown di formulir Kontak. Sekarang ketiganya
ditulis terpisah dan bisa berbeda sendiri tanpa ketahuan.

## 8. Perubahan URL

Alamat berubah dari `kontak.html` menjadi `/kontak`, dan seterusnya untuk
semua halaman. Situs belum pernah terbit, jadi tidak ada tautan lama yang
rusak dan tidak diperlukan pengalihan.

Naskah tiap halaman tetap ditulis langsung di berkas `.astro` masing-masing.
Ini **sementara**, bukan permanen: naskah pindah ke CMS pada Tahap 2c.

## 9. Repo, git, dan token

Repo: `https://github.com/mihitz21-dot/dhmakeupwebsite.git`
Keadaan saat spec ini ditulis: sudah ada, **publik**, kosong (0 byte, tanpa
README), branch utama `main`. Push pertama bersih tanpa konflik.

### Identitas commit

Repo ini publik, sehingga nama dan email pada tiap commit dapat dibaca siapa
saja dan rutin dipanen untuk spam. Menghapusnya kemudian berarti menulis ulang
seluruh riwayat.

Karena itu `user.email` memakai alamat penyamaran GitHub. Nyalakan
*Keep my email addresses private* di **Settings → Emails**, lalu salin alamat
`...@users.noreply.github.com` yang tertera di sana.

```bash
git init
git config --local user.name  "<nama>"
git config --local user.email "<id>+mihitz21-dot@users.noreply.github.com"
git branch -M main
git remote add origin https://github.com/mihitz21-dot/dhmakeupwebsite.git
```

Seluruhnya `--local`, tidak menyentuh konfigurasi global maupun repo lain.

### Token

Pakai **fine-grained token**, bukan classic. GitHub: Settings → Developer
settings → Personal access tokens → Fine-grained tokens. Batasi ke repo
`dhmakeupwebsite` saja, izin **Contents: Read and write**. Classic token dengan
scope `repo` memberi akses penuh ke seluruh repo, dan di device ini ada repo
lain, jadi itu risiko yang tidak perlu.

Token disimpan lewat credential helper per-repo, ke dalam `.git/` yang tidak
pernah ikut ter-commit. **Perintah penyimpanan dijalankan sendiri oleh pemilik
repo di terminalnya**, supaya nilai tokennya tidak pernah masuk ke transkrip
percakapan mana pun.

### `.gitignore`

`node_modules/`, `dist/`, `.astro/`, `.env*`, `.vercel/`, dan berkas kredensial.

### Vercel

Disambungkan lewat dashboard, bukan CLI. Import dari GitHub, preset Astro
terdeteksi otomatis (`astro build`, keluaran `dist`). Push ke `main` menjadi
produksi, branch lain mendapat URL preview sendiri. Tahap 1 tidak membutuhkan
environment variable sama sekali.

## 10. Kebijakan rahasia

Berlaku sejak sekarang, sebelum ada rahasia apa pun, karena repo ini publik dan
satu kali bocor berarti kuncinya harus dicabut, bukan sekadar commit-nya
dihapus.

- Apa pun yang rahasia tidak pernah masuk `site.ts` dan tidak pernah masuk repo.
- Kunci anon Supabase boleh publik secara desain, tetapi tetap disimpan sebagai
  environment variable, bukan ditulis langsung di kode.
- Service role Supabase dan token Fonnte hanya hidup sebagai environment
  variable di sisi server, dan tidak pernah dapat dibaca oleh kunci publik.
- Token Fonnte nanti disimpan di tabel terpisah yang ditolak total oleh kunci
  publik. Kolomnya di admin bersifat tulis saja, tidak dapat dibaca ulang, dan
  proses build tidak pernah menyentuh tabel itu.

## 11. Syarat lulus

Dibuktikan dengan dijalankan, bukan diklaim. Pemeriksaan dijalankan terhadap
hasil `astro build`, bukan terhadap berkas sumber.

| Pemeriksaan | Ambang |
|---|---|
| Tautan internal | 0 mati, 0 anchor mati |
| Kontras WCAG AA | 0 teks di bawah ambang, 7 halaman |
| Target sentuh | semua ≥ 44px pada lebar 360px |
| Overflow horizontal | 0 pada lebar 320px |
| Struktur | 1 `<h1>` per halaman, tanpa lompatan tingkat heading, `lang`, `title`, landmark lengkap |
| Klik-tayang | formulir booking 4 state, filter galeri termasuk kategori kosong, menu ponsel buka, Escape, scrim, navigasi |
| Error konsol | 0 |
| Em dash | 0 |
| Perbandingan hasil build | lihat di bawah |
| Situs di Vercel | terbuka, 7 halaman dapat dinavigasi |

### Cara membandingkan hasil build

Agar tidak samar, perbandingannya dilakukan dengan dua cara dan keduanya harus
lulus:

1. **Teks terbaca.** Seluruh teks yang terlihat diambil dari tiap halaman versi
   lama dan versi hasil build, dinormalkan spasinya, lalu dibandingkan. Harus
   identik. Ini menangkap naskah yang tidak sengaja hilang atau berubah saat
   dipindah ke komponen.
2. **Tangkapan layar.** Tiap halaman difoto penuh pada lebar 390px dan 1440px,
   versi lama dan versi baru, lalu dibandingkan. Perbedaan yang tersisa harus
   dapat dijelaskan satu per satu. Satu perbedaan sudah diketahui dan memang
   disengaja, yaitu alamat halaman pada tautan navigasi berubah dari
   `kontak.html` menjadi `/kontak`.

## 12. Risiko

**Situs terbit dengan 20 slot foto kosong dan kontak masih placeholder.**
Begitu ada di internet, siapa pun dapat menemukannya. Mitigasi: Tahap 1 terbit
sebagai URL `.vercel.app` yang tidak disebarkan, dan baru dipakai serius
setelah Tahap 2b mengisi fotonya.

**Port 1.843 baris HTML ke komponen berpotensi menggeser sesuatu tanpa
disadari.** Mitigasi: baris "perbandingan hasil build" pada tabel syarat lulus.

**Spec ini ditulis sebelum repo git ada.** Commit pertamanya, termasuk commit
berkas ini sendiri, menjadi langkah awal implementasi Tahap 1.

## 13. Peta jalan setelah Tahap 1

| Tahap | Isi |
|---|---|
| 2a | Supabase, login, kerangka admin, pengaturan dan kontak. Irisan terkecil yang membuktikan jalur Supabase ke admin ke build ulang bekerja |
| 2b | Foto portofolio: unggah, urutan, kategori, keterangan |
| 2c | Paket, harga, dan naskah halaman |
| 3 | Booking tersimpan, notifikasi email, acara otomatis di Google Calendar |
| 4 | Ulasan klien dengan moderasi |
| Fonnte | Saluran notifikasi opsional, menyala sendiri begitu tokennya diisi. Hanya untuk memberi tahu pemilik, tidak untuk membalas otomatis ke calon klien, karena pengiriman otomatis lewat jalur tidak resmi berisiko nomornya diblokir |

Tahap kalender ketersediaan **dicoret**. Google Calendar menggantikannya:
pemilik menandai tanggal di aplikasi kalender yang sudah dipakai sehari-hari,
dan situs membacanya.

Tahap 2a sengaja dibuat kecil. Jika jalur Supabase ke admin ke build ulang
bermasalah, lebih baik ketahuan saat yang dipertaruhkan hanya satu nomor
telepon, bukan saat 20 foto dan seluruh naskah sudah masuk.

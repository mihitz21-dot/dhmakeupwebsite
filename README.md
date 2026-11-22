# DH Makeup Studio

Situs DH Makeup Studio. Astro, keluaran statis, terbit lewat Vercel.

## Menjalankan

    npm install
    npm run dev      # http://localhost:4321
    npm run build    # keluaran ke dist/

## Struktur

- `src/data/site.ts` satu-satunya sumber nilai yang berulang. `getSite()`
  sengaja async supaya Tahap 2 cukup mengganti isinya dengan pengambilan
  dari Supabase, tanpa menyunting halaman mana pun.
- `src/components/PhotoSlot.astro` bingkai foto. Saat foto dikelola Supabase,
  hanya berkas ini yang berubah.
- `src/styles/site.css` dan `src/scripts/site.js` salinan persis dari versi
  statis. Jangan disunting tanpa menjalankan ulang gerbang verifikasi.

## Mengisi kontak

Ubah `kontak` di `src/data/site.ts`. Nilai `null` berarti belum diisi dan
ditampilkan sebagai cip placeholder, bukan tautan. Mengisi satu nilai
memperbarui seluruh tempat yang memakainya.

## Mengisi foto

Lihat `public/foto/LETAKKAN-FOTO-DI-SINI.txt`.

## Verifikasi

Lihat `tools/verify/README.md`. Jalankan sebelum tiap push yang menyentuh
tampilan.

## Token GitHub

Push memakai token fine-grained yang disimpan di `.git/dh-credentials`, di luar
jangkauan git. Tokennya kedaluwarsa **22 Desember 2026**. Setelah tanggal itu
push ditolak dengan pesan autentikasi yang membingungkan.

Perbaikannya: buat token fine-grained baru di GitHub, dibatasi ke repo ini saja
dengan izin Contents Read and write, lalu tulis ulang berkasnya.

    printf 'https://mihitz21-dot:%s@github.com\n' "TOKEN_BARU" > .git/dh-credentials

Jangan menambahkan `credential.useHttpPath`. Dengan opsi itu git mencocokkan
kredensial berikut path repo, sedangkan baris yang disimpan tidak memuat path,
sehingga push tetap ditolak.

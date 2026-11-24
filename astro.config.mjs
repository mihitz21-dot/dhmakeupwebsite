import { defineConfig } from 'astro/config';

export default defineConfig({
  // Alamat kanonik situs. Dipakai untuk <link rel="canonical">, og:url, dan
  // sitemap.xml. GANTI nilai ini kalau pemilik situs memakai domain sendiri
  // (misalnya https://dhmakeupstudio.com), karena canonical dan sitemap yang
  // menunjuk domain lama membuat mesin pencari mengindeks alamat yang salah.
  site: 'https://dhmakeupwebsite.vercel.app',

  // Keluaran statis murni. Tahap 1 tidak memakai adapter SSR.
  // Format direktori memberi alamat /kontak, bukan /kontak.html.
  build: { format: 'directory' },
});

import { defineConfig } from 'astro/config';

export default defineConfig({
  // Keluaran statis murni. Tahap 1 tidak memakai adapter SSR.
  // Format direktori memberi alamat /kontak, bukan /kontak.html.
  build: { format: 'directory' },
});

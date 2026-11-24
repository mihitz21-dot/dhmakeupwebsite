/**
 * Satu-satunya tempat yang memutuskan bentuk alamat kanonik.
 *
 * Base.astro dan sitemap.xml.ts sama-sama memanggil fungsi di sini, supaya
 * canonical sebuah halaman dan barisnya di sitemap tidak mungkin berbeda.
 * Kalau keduanya dihitung terpisah, satu garis miring saja sudah cukup untuk
 * membuat mesin pencari menganggapnya dua alamat berbeda.
 *
 * Bentuk yang dipilih: selalu berakhir garis miring, karena `build.format`
 * di astro.config.mjs adalah 'directory', jadi halaman sungguhan terbit di
 * /kontak/index.html dan dilayani di /kontak/. Beranda jadi "/".
 */

/** Menormalkan jalur apa pun menjadi bentuk "/", "/kontak/", dst. */
export function jalurKanonik(pathname: string): string {
  const tanpaIndex = pathname.replace(/index\.html$/, '');
  const inti = tanpaIndex.replace(/^\/+/, '').replace(/\/+$/, '');
  return inti === '' ? '/' : '/' + inti + '/';
}

/** Alamat absolut sebuah jalur terhadap `site` di astro.config.mjs. */
export function alamatKanonik(site: URL | undefined, pathname: string): string {
  // `site` hanya undefined kalau astro.config.mjs kehilangan kuncinya. Lebih
  // baik build gagal keras daripada menerbitkan canonical relatif yang tidak
  // berguna bagi mesin pencari maupun pratinjau WhatsApp.
  if (!site) {
    throw new Error(
      'Astro.site kosong. Isi `site` di astro.config.mjs sebelum build, ' +
      'karena canonical, og:url, dan sitemap.xml membutuhkannya.'
    );
  }
  return new URL(jalurKanonik(pathname), site).href;
}

/** Ketujuh halaman publik. /admin sengaja tidak ada di sini. */
export const HALAMAN_PUBLIK = [
  '/',
  '/layanan',
  '/paket',
  '/portofolio',
  '/tentang',
  '/ulasan',
  '/kontak',
] as const;

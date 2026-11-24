import type { APIRoute } from 'astro';
import { HALAMAN_PUBLIK, alamatKanonik } from '../lib/alamat';

/**
 * sitemap.xml dibuat sendiri lewat endpoint Astro, bukan dengan menambah
 * dependensi. Daftar halamannya dan cara menyusun alamatnya diambil dari
 * src/lib/alamat.ts, modul yang sama dengan yang dipakai <link rel="canonical">
 * di Base.astro. Jadi alamat di sini tidak bisa berbeda dari canonical, bahkan
 * tidak oleh satu garis miring.
 *
 * /admin tidak ada di HALAMAN_PUBLIK dan karena itu tidak mungkin ikut
 * tercantum di sini.
 *
 * Tidak ada <lastmod>. Repo ini tidak menyimpan tanggal ubah per halaman, dan
 * mencantumkan tanggal build akan menandai ketujuh halaman sebagai "baru
 * berubah" setiap kali situs dibangun ulang, padahal isinya sama.
 */

// Alamat hanya berisi karakter aman, tapi penyaringnya tetap dipasang supaya
// penambahan halaman di masa depan tidak bisa merusak XML-nya.
function amanXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = ({ site }) => {
  const baris = HALAMAN_PUBLIK
    .map((jalur) => `  <url><loc>${amanXml(alamatKanonik(site, jalur))}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${baris}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

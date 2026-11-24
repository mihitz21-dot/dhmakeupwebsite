// Mengunduh seluruh foto dari Supabase Storage ke public/assets/foto/ sebelum
// Astro membangun. Dengan begitu foto ikut diterbitkan bersama halaman, dan
// pengunjung mengambilnya dari Vercel, tidak pernah menyentuh Supabase. Tier
// gratis Supabase dijeda setelah tujuh hari tanpa aktivitas; kalau foto diambil
// saat kunjungan, seluruh foto berubah jadi kotak kosong saat itu terjadi.
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Di Vercel env var sudah ada di process.env. Di lokal nilainya ada di .env,
// dan skrip Node biasa tidak membacanya sendiri seperti Astro.
if (existsSync('.env')) {
  try { process.loadEnvFile('.env'); } catch { /* sudah ada di process.env */ }
}

const URL_SB = (process.env.PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
const TUJUAN = 'public/assets/foto';

if (!URL_SB || !KEY) {
  throw new Error(
    'PUBLIC_SUPABASE_URL atau PUBLIC_SUPABASE_ANON_KEY belum diisi. ' +
    'Isi berkas .env di akar project, dan Environment Variables di Vercel.'
  );
}

const r = await fetch(URL_SB + '/rest/v1/foto?select=slot,berkas', {
  headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
});
if (!r.ok) {
  throw new Error('Gagal membaca tabel foto: HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
const baris = await r.json();

await mkdir(TUJUAN, { recursive: true });

// Buang berkas lama yang tidak lagi dirujuk, supaya build tidak menumpuk sisa
// dari foto yang sudah diganti.
const dipakai = new Set(baris.filter((b) => b.berkas).map((b) => b.berkas));
for (const f of await readdir(TUJUAN)) {
  if (f.endsWith('.txt')) continue;
  if (!dipakai.has(f)) await unlink(TUJUAN + '/' + f);
}

let n = 0;
for (const b of baris) {
  if (!b.berkas) continue;
  const alamat = URL_SB + '/storage/v1/object/public/foto/' + b.berkas;
  const g = await fetch(alamat);
  if (!g.ok) {
    throw new Error(
      'Gagal mengunduh foto untuk slot "' + b.slot + '" (' + b.berkas + '): HTTP ' + g.status +
      '. Build sengaja dihentikan daripada menerbitkan situs dengan gambar hilang.'
    );
  }
  await writeFile(TUJUAN + '/' + b.berkas, Buffer.from(await g.arrayBuffer()));
  n++;
}
console.log('ambil-foto: ' + n + ' foto diunduh dari ' + baris.length + ' posisi');

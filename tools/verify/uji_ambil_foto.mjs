// Menguji tools/ambil-foto.mjs dengan MENJALANKAN skrip itu apa adanya terhadap
// server tiruan yang meniru dua endpoint Supabase. Skripnya tidak disalin dan
// tidak ditiru, jadi uji ini ikut berubah kalau skripnya disunting.
//
//   node tools/verify/uji_ambil_foto.mjs
//
// Jalur suksesnya tidak bisa diuji terhadap Supabase sungguhan selama bucket
// masih kosong, karena mengunggah butuh sesi login. Tanpa uji ini, satu-satunya
// jalur yang pernah terbukti adalah jalur gagal, padahal yang menentukan foto
// jadi terbit atau tidak justru jalur sukses.
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const SKRIP = resolve('tools/ambil-foto.mjs');
const JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');

let gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  if (!ok) gagal++;
  console.log(`  ${ok ? 'lulus' : 'GAGAL'}  ${nama}: dapat ${JSON.stringify(dapat)}, harap ${JSON.stringify(harap)}`);
};

function server(baris, berkasAda) {
  return createServer((req, res) => {
    if (req.url.startsWith('/rest/v1/foto')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(baris));
      return;
    }
    const m = req.url.match(/\/storage\/v1\/object\/public\/foto\/([^?]+)/);
    if (m && berkasAda.has(decodeURIComponent(m[1]))) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(JPEG);
      return;
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end('{"error":"not_found","message":"Object not found"}');
  });
}

async function jalankan(baris, berkasAda, siapkan) {
  const srv = server(baris, berkasAda);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const asal = 'http://127.0.0.1:' + srv.address().port;

  const kerja = await mkdtemp(join(tmpdir(), 'ambilfoto-'));
  const tujuan = join(kerja, 'public', 'assets', 'foto');
  await mkdir(tujuan, { recursive: true });
  await writeFile(join(tujuan, 'LETAKKAN-FOTO-DI-SINI.txt'), 'penanda');
  if (siapkan) await siapkan(tujuan);

  const p = spawn(process.execPath, [SKRIP], {
    cwd: kerja,
    env: { ...process.env, PUBLIC_SUPABASE_URL: asal, PUBLIC_SUPABASE_ANON_KEY: 'kunci-uji' },
  });
  let keluaran = '';
  p.stdout.on('data', (d) => (keluaran += d));
  p.stderr.on('data', (d) => (keluaran += d));
  const kode = await new Promise((r) => p.on('close', r));

  const isi = (await readdir(tujuan)).sort();
  srv.close();
  return { kode, keluaran, isi, tujuan, kerja };
}

console.log('jalur sukses:');
{
  const baris = [
    { slot: 'hero', berkas: 'hero-111.jpg' },
    { slot: 'plat-01', berkas: 'plat-01-222.jpg' },
    { slot: 'perias', berkas: null },
  ];
  const r = await jalankan(baris, new Set(['hero-111.jpg', 'plat-01-222.jpg']));
  cek('keluar dengan kode 0', r.kode, 0);
  cek('dua foto terunduh', r.isi.filter((f) => f.endsWith('.jpg')).length, 2);
  cek('penanda .txt selamat', r.isi.includes('LETAKKAN-FOTO-DI-SINI.txt'), true);
  cek('baris berkas null dilewati', r.isi.includes('null'), false);
  const b = await readFile(join(r.tujuan, 'hero-111.jpg'));
  cek('isi berkas benar-benar tertulis', b.equals(JPEG), true);
  cek('keluaran menyebut jumlahnya', /2 foto diunduh dari 3 posisi/.test(r.keluaran), true);
  await rm(r.kerja, { recursive: true, force: true });
}

console.log('pembersihan berkas basi:');
{
  const baris = [{ slot: 'hero', berkas: 'hero-baru.jpg' }];
  const r = await jalankan(baris, new Set(['hero-baru.jpg']), async (t) => {
    await writeFile(join(t, 'hero-lama.jpg'), 'basi');
  });
  cek('berkas basi dihapus', r.isi.includes('hero-lama.jpg'), false);
  cek('berkas baru ada', r.isi.includes('hero-baru.jpg'), true);
  cek('penanda .txt tetap selamat', r.isi.includes('LETAKKAN-FOTO-DI-SINI.txt'), true);
  await rm(r.kerja, { recursive: true, force: true });
}

console.log('jalur gagal:');
{
  const baris = [{ slot: 'plat-07', berkas: 'tidak-ada.jpg' }];
  const r = await jalankan(baris, new Set());
  cek('keluar dengan kode bukan nol', r.kode !== 0, true);
  cek('pesan menyebut slotnya', /plat-07/.test(r.keluaran), true);
  await rm(r.kerja, { recursive: true, force: true });
}

console.log(gagal === 0 ? 'SEMUA LULUS' : `${gagal} GAGAL`);
process.exitCode = gagal === 0 ? 0 : 1;

// Uji logika pemantauan build di src/scripts/admin-umum.js.
//
//   node tools/verify/uji_pantau.mjs src/scripts/admin-umum.js
//
// Berdiri sendiri: menyalakan server HTTP-nya sendiri di port acak dan
// menyajikan halaman ujinya dari memori. Versi sebelumnya menuntut folder uji
// disiapkan tangan lebih dulu, dan tes yang butuh penyiapan tangan adalah tes
// yang tidak akan pernah dijalankan orang lain.
//
// Kode yang diuji DIAMBIL dari berkasnya dengan regex, tidak ditulis ulang,
// supaya uji ini ikut berubah kalau berkas itu disunting.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const berkas = process.argv[2] || 'src/scripts/admin-umum.js';
const src = readFileSync(berkas, 'utf8');

const mT = src.match(/(?:export )?(function tayang\(dibangun, diperbarui\) \{[\s\S]*?\n\})/);
if (!mT) { console.log('GAGAL: fungsi tayang tidak ditemukan di ' + berkas); process.exit(1); }
const mP = src.match(/(?:export )?(async function ambilPenanda\(situs\) \{[\s\S]*?\n\})/);
if (!mP) { console.log('GAGAL: fungsi ambilPenanda tidak ditemukan di ' + berkas); process.exit(1); }

const tayang = new Function(mT[1] + '; return tayang;')();
const ambilPenanda = new Function(mP[1] + '; return ambilPenanda;')();

const PENANDA = '2026-11-24T09:00:00.000Z';
const halaman = (isi) => '<!DOCTYPE html><html><head>' + isi + '</head><body>uji</body></html>';

// Halaman 404 yang SENGAJA memuat penanda. Tanpa ini, penjagaan `if (!r.ok)`
// tidak teramati: badan 404 biasa tidak memuat kata "dibangun", jadi regexnya
// tetap gagal dan hasilnya tetap null walau penjagaannya dihapus. Dengan
// halaman ini, melewatkan status HTTP berarti membaca penanda dari halaman
// galat, dan itu persis kesalahan yang mau dicegah: menyangka sebuah build
// sudah tayang padahal yang dibaca cuma halaman galat.
const server = createServer((req, res) => {
  if (req.url.startsWith('/ada')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(halaman('<meta name="dibangun" content="' + PENANDA + '">'));
  } else if (req.url.startsWith('/tanpa')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(halaman(''));
  } else if (req.url.startsWith('/galat-berpenanda')) {
    res.writeHead(503, { 'Content-Type': 'text/html' });
    res.end(halaman('<meta name="dibangun" content="1999-01-01T00:00:00.000Z">'));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(halaman(''));
  }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const asal = 'http://127.0.0.1:' + server.address().port;

let gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  if (!ok) gagal++;
  console.log(`  ${ok ? 'lulus' : 'GAGAL'}  ${nama}: dapat ${JSON.stringify(dapat)}, harap ${JSON.stringify(harap)}`);
};

console.log('ambilPenanda() terhadap server sungguhan:');
const penanda = await ambilPenanda(asal + '/ada');
cek('penanda terbaca dari halaman yang memuatnya', penanda, PENANDA);
cek('halaman tanpa penanda jadi null', await ambilPenanda(asal + '/tanpa'), null);
cek('halaman yang tidak ada jadi null', await ambilPenanda(asal + '/tidak-ada'), null);
cek('halaman galat yang memuat penanda tetap null', await ambilPenanda(asal + '/galat-berpenanda'), null);
cek('host mati jadi null', await ambilPenanda('http://127.0.0.1:1'), null);

console.log('tayang() memakai penanda yang betul-betul diambil dari server:');
cek('penanda lebih TUA dari waktu simpan belum tayang', tayang(penanda, '2026-11-24T10:00:00.000Z'), false);
cek('penanda lebih BARU dari waktu simpan sudah tayang', tayang(penanda, '2026-11-24T08:00:00.000Z'), true);

console.log('tayang() keadaan tepi:');
cek('penanda sama persis belum tayang', tayang(PENANDA, PENANDA), false);
cek('penanda null belum tayang', tayang(null, PENANDA), false);
cek('waktu simpan null belum tayang', tayang(PENANDA, null), false);
cek('penanda bukan tanggal belum tayang', tayang('bukan-tanggal', PENANDA), false);
cek('timestamptz gaya Postgres dibaca benar',
    tayang('2026-11-24T10:00:00.500000+00:00', '2026-11-24T10:00:00.123456+00:00'), true);
cek('beda zona waktu dibandingkan sebagai saat yang sama',
    tayang('2026-11-24T17:00:01+07:00', '2026-11-24T10:00:00Z'), true);

// Halaman ini hanya punya SATU pemantau, karena timer dan nomor sesinya
// dipegang bersama satu modul. Mengunggah foto kedua, atau menyimpan
// pengaturan sambil foto masih dipantau, memindahkan pemantau itu. Tanpa
// pesan pelepasan, kotak yang tadi dipantau berhenti selamanya di
// "Tersimpan" dan pemilik situs akan menyangka penyimpanannya gagal.
// Modulnya diimpor apa adanya, bukan disalin, jadi uji ini ikut berubah
// kalau berkasnya disunting.
console.log('pantauBuild() saat pemantauannya berpindah tempat:');

const simpul = (tag) => ({
  tag, className: '', textContent: '', attr: {}, anak: [],
  setAttribute(k, v) { this.attr[k] = v; },
  appendChild(n) { this.anak.push(n); return n; },
});
const ambilTeks = (n, kelas) => {
  const p = n.anak.find((x) => x.className === kelas);
  return p ? p.textContent : '';
};
const judul = (n) => ambilTeks(n, 'outcome__title');
const isi = (n) => ambilTeks(n, 'outcome__text');

globalThis.document = { createElement: (tag) => simpul(tag) };
globalThis.location = { origin: asal + '/tanpa' };

const umum = await import(pathToFileURL(resolve(berkas)).href);

const a = simpul('div');
const b = simpul('div');
umum.pantauBuild(a, '2026-11-24T10:00:00Z');
cek('kotak yang baru dipantau belum ditulisi apa pun', judul(a), '');

umum.pantauBuild(b, '2026-11-24T10:00:01Z');
cek('kotak lama diberi pesan pelepasan', judul(a), 'Tersimpan, pemantauannya dilepas');
cek('pesan pelepasan menyebut datanya aman', /sudah masuk basis data/.test(isi(a)), true);
cek('kotak yang sekarang dipantau tidak ikut ditulisi', judul(b), '');

umum.pantauBuild(b, '2026-11-24T10:00:02Z');
cek('memantau ulang kotak yang sama tidak menuduhnya dilepas', judul(b), '');

umum.hentikanPantau();
umum.pantauBuild(simpul('div'), '2026-11-24T10:00:03Z');
cek('sesudah hentikanPantau tidak ada kotak lama yang dituju', judul(b), '');

// Timer 10 detik yang menggantung menahan Node tetap hidup.
umum.hentikanPantau();

server.close();
console.log(gagal === 0 ? 'SEMUA LULUS' : `${gagal} GAGAL`);
// process.exitCode, bukan process.exit(): mematikan Node di tengah soket yang
// sedang ditutup membuat libuv jatuh dengan assertion di Windows.
process.exitCode = gagal === 0 ? 0 : 1;

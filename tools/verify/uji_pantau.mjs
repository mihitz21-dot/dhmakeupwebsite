// Uji logika pemantauan build di src/scripts/admin.js.
// Kodenya DIAMBIL dari berkasnya, tidak ditulis ulang, supaya uji ini ikut
// berubah kalau berkasnya disunting.
//
//   node tools/verify/uji_pantau.mjs src/scripts/admin.js http://127.0.0.1:8731
import { readFileSync } from 'node:fs';

const src = readFileSync(process.argv[2], 'utf8');
const asal = process.argv[3];
if (!asal) { console.log('GAGAL: alamat server uji tidak diberikan'); process.exit(1); }

const mT = src.match(/function tayang\(dibangun, diperbarui\) \{[\s\S]*?\n\}/);
if (!mT) { console.log('GAGAL: fungsi tayang tidak ditemukan'); process.exit(1); }
const mP = src.match(/async function ambilPenanda\(situs\) \{[\s\S]*?\n\}/);
if (!mP) { console.log('GAGAL: fungsi ambilPenanda tidak ditemukan'); process.exit(1); }

const tayang = new Function(mT[0] + '; return tayang;')();
const ambilPenanda = new Function(mP[0] + '; return ambilPenanda;')();

let gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  if (!ok) gagal++;
  console.log(`  ${ok ? 'lulus' : 'GAGAL'}  ${nama}: dapat ${JSON.stringify(dapat)}, harap ${JSON.stringify(harap)}`);
};

console.log('ambilPenanda() terhadap server sungguhan:');
const penanda = await ambilPenanda(asal + '/ada');
cek('penanda terbaca dari halaman yang memuatnya', penanda, '2026-11-24T09:00:00.000Z');
cek('halaman tanpa penanda jadi null', await ambilPenanda(asal + '/tanpa'), null);
cek('halaman yang tidak ada jadi null', await ambilPenanda(asal + '/hilang'), null);
cek('host mati jadi null', await ambilPenanda('http://127.0.0.1:1/'), null);

// Inti Cacat 1: penanda yang berubah belum berarti build itu membawa nilai
// yang baru disimpan. Build yang lebih TUA daripada waktu simpan tidak boleh
// dianggap tayang, walaupun penandanya beda dari penanda sebelumnya.
const simpan = '2026-11-24T10:00:00.000Z';
console.log('tayang() memakai penanda yang betul-betul diambil dari server:');
cek('penanda lebih TUA dari waktu simpan belum tayang', tayang(penanda, simpan), false);
cek('penanda lebih BARU dari waktu simpan sudah tayang', tayang('2026-11-24T10:00:01.000Z', simpan), true);

console.log('tayang() keadaan tepi:');
cek('penanda sama persis belum tayang', tayang(simpan, simpan), false);
cek('penanda null belum tayang', tayang(null, simpan), false);
cek('waktu simpan null belum tayang', tayang('2026-11-24T10:00:01.000Z', null), false);
cek('penanda bukan tanggal belum tayang', tayang('bukan-tanggal', simpan), false);
cek('timestamptz gaya Postgres dibaca benar',
  tayang('2026-11-24T10:00:01.000Z', '2026-11-24T10:00:00.123456+00:00'), true);
cek('beda zona waktu dibandingkan sebagai saat yang sama',
  tayang('2026-11-24T17:00:01.000+07:00', '2026-11-24T10:00:00.000Z'), true);

console.log(gagal === 0 ? 'SEMUA LULUS' : `${gagal} GAGAL`);
// process.exit() di sini membuat Node di Windows jatuh dengan assertion
// libuv karena masih ada soket fetch yang sedang ditutup. exitCode membiarkan
// Node selesai sendiri lalu keluar dengan kode yang sama.
process.exitCode = gagal === 0 ? 0 : 1;

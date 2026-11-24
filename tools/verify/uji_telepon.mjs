// Uji normalisasi nomor telepon di src/lib/telepon.ts.
//
//   node tools/verify/uji_telepon.mjs src/lib/telepon.ts
//
// Kodenya DIAMBIL dari berkasnya, bukan ditulis ulang, supaya uji ini ikut
// berubah kalau berkas itu disunting.
//
// Kenapa uji ini ada: tautan wa.me yang salah bentuk GAGAL DIAM-DIAM. Situs
// ini pernah tayang dengan wa.me/085210009795, yang tidak pernah sampai ke
// chat, sementara alamatnya tetap menjawab HTTP 200 dan halamannya tetap
// terbuka. Tidak ada satu pun gerbang yang menangkapnya, dan untuk usaha yang
// jalannya lewat WhatsApp itu satu-satunya tombol yang benar-benar penting.
import { readFileSync } from 'node:fs';

const src = readFileSync(process.argv[2] || 'src/lib/telepon.ts', 'utf8');
const m = src.match(/export function nomorE164\([\s\S]*?\n\}/);
if (!m) { console.log('GAGAL: fungsi nomorE164 tidak ditemukan'); process.exit(1); }

// buang anotasi tipe TypeScript supaya bisa dijalankan Node apa adanya
const js = m[0]
  .replace('export function', 'function')
  .replace(/\(mentah: [^)]*\)/, '(mentah)')
  .replace(/\): string \| null \{/, ') {');
const nomorE164 = new Function(js + '; return nomorE164;')();

let gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = dapat === harap;
  if (!ok) gagal++;
  console.log(`  ${ok ? 'lulus' : 'GAGAL'}  ${nama}: dapat ${JSON.stringify(dapat)}, harap ${JSON.stringify(harap)}`);
};

console.log('bentuk yang ditulis orang Indonesia:');
cek('nol di depan',            nomorE164('085210009795'),     '6285210009795');
cek('sudah 62',                nomorE164('6285210009795'),    '6285210009795');
cek('plus 62',                 nomorE164('+6285210009795'),   '6285210009795');
cek('pakai spasi',             nomorE164('0852 1000 9795'),   '6285210009795');
cek('pakai tanda hubung',      nomorE164('0852-1000-9795'),   '6285210009795');
cek('plus 62 berspasi',        nomorE164('+62 852 1000 9795'),'6285210009795');
cek('tanpa nol di depan',      nomorE164('85210009795'),      '6285210009795');
cek('salah ketik 62 lalu nol', nomorE164('62085210009795'),   '6285210009795');

console.log('yang harus ditolak:');
cek('kosong',                  nomorE164(''),                 null);
cek('null',                    nomorE164(null),               null);
cek('undefined',               nomorE164(undefined),          null);
cek('bukan angka sama sekali', nomorE164('halo'),             null);
cek('terlalu pendek',          nomorE164('0852'),             null);
cek('terlalu panjang',         nomorE164('0852100097951234'), null);
cek('kode negara lain',        nomorE164('14155552671'),      null);

console.log(gagal === 0 ? 'SEMUA LULUS' : `${gagal} GAGAL`);
process.exitCode = gagal === 0 ? 0 : 1;

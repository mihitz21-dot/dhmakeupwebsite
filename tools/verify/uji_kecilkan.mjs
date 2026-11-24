// Menguji ukuranBaru() dari src/scripts/kecilkan.js. Kodenya DIAMBIL dari
// berkasnya, bukan ditulis ulang, jadi uji ini ikut berubah kalau fungsinya
// disunting. kecilkan() menyentuh kanvas dan tidak bisa diuji di Node.
//
//   node tools/verify/uji_kecilkan.mjs src/scripts/kecilkan.js
import { readFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');

const mK = src.match(/export const MAKS_SISI = [^;]+;/);
if (!mK) { console.log('GAGAL: MAKS_SISI tidak ditemukan'); process.exit(1); }
const mU = src.match(/export function ukuranBaru\([\s\S]*?\n\}/);
if (!mU) { console.log('GAGAL: fungsi ukuranBaru tidak ditemukan'); process.exit(1); }

const js = (mK[0] + '\n' + mU[0]).replace(/export /g, '');
const ukuranBaru = new Function(js + '; return ukuranBaru;')();

let gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  if (!ok) gagal++;
  console.log(`  ${ok ? 'lulus' : 'GAGAL'}  ${nama}: dapat ${JSON.stringify(dapat)}, harap ${JSON.stringify(harap)}`);
};

console.log('ukuranBaru():');
cek('lanskap besar', ukuranBaru(4000, 3000, 1600), { lebar: 1600, tinggi: 1200 });
cek('potret besar', ukuranBaru(3000, 4000, 1600), { lebar: 1200, tinggi: 1600 });
cek('sudah kecil, dibiarkan', ukuranBaru(1200, 900, 1600), { lebar: 1200, tinggi: 900 });
cek('persis di batas', ukuranBaru(1600, 1600, 1600), { lebar: 1600, tinggi: 1600 });
cek('tidak membagi nol', ukuranBaru(0, 0, 1600), { lebar: 0, tinggi: 0 });
cek('sisi pendek tidak jadi nol', ukuranBaru(8000, 10, 1600), { lebar: 1600, tinggi: 2 });
cek('ekstrem: sisi pendek tetap minimal 1', ukuranBaru(16000, 1, 1600), { lebar: 1600, tinggi: 1 });
cek('batas bawaan 1600 dipakai', ukuranBaru(4000, 3000), { lebar: 1600, tinggi: 1200 });

console.log(gagal === 0 ? 'SEMUA LULUS' : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);

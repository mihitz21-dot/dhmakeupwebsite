import { readFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');

// Ambil kode dari berkasnya, jangan tulis ulang logikanya.
const mR = src.match(/const RASIO: \[string, number\]\[\] = \[[\s\S]*?\n\];/);
if (!mR) { console.log('GAGAL: tabel RASIO tidak ditemukan'); process.exit(1); }
const mB = src.match(/export function bingkai\([\s\S]*?\n\}/);
if (!mB) { console.log('GAGAL: fungsi bingkai tidak ditemukan'); process.exit(1); }

const rasioJs = mR[0].replace('const RASIO: [string, number][] =', 'const RASIO =');
const bingkaiJs = mB[0]
  .replace('export function', 'function')
  .replace(/bingkai\([^)]*\)/, 'bingkai(lebar, tinggi)')
  .replace(/\): string \{/, ') {');
const bingkai = new Function(rasioJs + '\n' + bingkaiJs + '; return bingkai;')();

let gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = dapat === harap;
  if (!ok) gagal++;
  console.log(`  ${ok ? 'lulus' : 'GAGAL'}  ${nama}: dapat ${JSON.stringify(dapat)}, harap ${JSON.stringify(harap)}`);
};

console.log('bingkai():');
cek('foto tegak sedang', bingkai(800, 1000), '4:5');
cek('foto tegak panjang', bingkai(700, 1050), '4:6');
cek('foto melebar', bingkai(960, 720), '16:12');
// Brief Task 3 menulis harapan '16:12' untuk kasus ini dengan alasan
// "terdekat ke 1.333". Itu salah hitung, dan sudah diukur: rasio 1.0 berjarak
// 0.2000 dari 4:5 (0.8000), tapi 0.3333 dari 16:12 (1.3333) dan juga 0.3333
// dari 4:6 (0.6667). Yang terdekat adalah 4:5. Kodenya benar, harapan di
// brief yang keliru, jadi yang dibetulkan di sini adalah harapannya.
cek('foto persegi, terdekat ke 4:5', bingkai(1000, 1000), '4:5');
cek('belum diisi, jatuh ke bawaan', bingkai(null, null), '4:5');
cek('tinggi nol tidak boleh membagi', bingkai(800, 0), '4:5');
cek('foto lanskap lebar', bingkai(1600, 900), '16:12');

console.log(gagal === 0 ? 'SEMUA LULUS' : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);

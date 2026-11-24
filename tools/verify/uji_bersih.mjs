import { readFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');

// Ambil kode dari berkasnya, jangan tulis ulang logikanya.
const mB = src.match(/export function bersih\([\s\S]*?\n\}/);
if (!mB) { console.log('GAGAL: fungsi bersih tidak ditemukan'); process.exit(1); }
const mA = src.match(/const area: string\[\] =([\s\S]*?);\n/);
if (!mA) { console.log('GAGAL: pipa area tidak ditemukan'); process.exit(1); }

const js = mB[0].replace('export function', 'function').replace(/: [^)]*\)/, ')').replace(/\): [^{]*\{/, ') {');
const areaJs = mA[1].replace(/\(a: string\)/g, '(a)');
const bersih = new Function(js + '; return bersih;')();
const pipaArea = new Function('data', 'return (' + areaJs + ');');

let gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  if (!ok) gagal++;
  console.log(`  ${ok ? 'lulus' : 'GAGAL'}  ${nama}: dapat ${JSON.stringify(dapat)}, harap ${JSON.stringify(harap)}`);
};

console.log('bersih():');
cek("string kosong jadi null", bersih(''), null);
cek("hanya spasi jadi null", bersih('   '), null);
cek("null tetap null", bersih(null), null);
cek("undefined jadi null", bersih(undefined), null);
cek("nilai sungguhan utuh", bersih('0812-3456-7890'), '0812-3456-7890');
cek("spasi di tepi dipangkas", bersih('  @dhmakeup  '), '@dhmakeup');

console.log('pipa area:');
cek("area berisi string kosong menyusut", pipaArea({area: ['', '  ']}), []);
cek("area campur disaring", pipaArea({area: ['Subang', '', ' Bandung ']}), ['Subang','Bandung']);
cek("area null jadi kosong", pipaArea({area: null}), []);
cek("area sah utuh", pipaArea({area: ['Subang','Purwakarta']}), ['Subang','Purwakarta']);

console.log(gagal === 0 ? 'SEMUA LULUS' : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);

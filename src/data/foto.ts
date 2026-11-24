import { supabase } from '../lib/supabase';

export interface Foto {
  slot: string;
  berkas: string | null;
  alt: string | null;
  lebar: number | null;
  tinggi: number | null;
}

// Ketiga rasio yang tersedia di site.css, beserta nilai lebar dibagi tinggi.
// Aturannya ditulis eksplisit supaya hasilnya sama setiap kali, bukan
// bergantung pada urutan pemeriksaan di dalam kode.
const RASIO: [string, number][] = [
  ['4:6', 700 / 1050],
  ['4:5', 800 / 1000],
  ['16:12', 960 / 720],
];

export function bingkai(lebar: number | null, tinggi: number | null): string {
  if (!lebar || !tinggi || tinggi <= 0) return '4:5';
  const r = lebar / tinggi;
  let pilih = RASIO[0];
  for (const kandidat of RASIO) {
    if (Math.abs(kandidat[1] - r) < Math.abs(pilih[1] - r)) pilih = kandidat;
  }
  return pilih[0];
}

let cache: Map<string, Foto> | null = null;

export async function getFoto(): Promise<Map<string, Foto>> {
  if (cache) return cache;

  const { data, error } = await supabase
    .from('foto')
    .select('slot, berkas, alt, lebar, tinggi');

  if (error) {
    throw new Error('Gagal mengambil data foto dari Supabase: ' + error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Tabel foto kosong. Jalankan SQL di docs/supabase-setup-2b.md.');
  }

  cache = new Map(data.map((r) => [r.slot, r as Foto]));
  return cache;
}

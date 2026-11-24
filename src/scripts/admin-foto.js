import { supabase } from '../lib/supabase';
import {
  terjemah, tulisKabar, pantauBuild, hentikanPantau,
} from './admin-umum.js';
import { kecilkan } from './kecilkan.js';

// Nama posisi dalam bahasa manusia. Urutannya menentukan urutan tampil.
// Unsur pertama tiap kelompok adalah id wadahnya di admin.astro: tiap
// kelompok digambar ke wadahnya sendiri, satu per tab, bukan semuanya ke satu
// wadah. Label tab yang dilihat pemilik situs ditulis di admin.astro.
const GRUP = [
  ['adm-foto-beranda', [
    ['hero', 'Foto utama'],
    ['beranda-01', 'Pilihan 01, Rias pengantin'],
    ['beranda-02', 'Pilihan 02, Lamaran'],
    ['beranda-03', 'Pilihan 03, Natural'],
    ['beranda-04', 'Pilihan 04, Kids makeup'],
  ]],
  ['adm-foto-acara', [
    ['acara-01', 'Wedding'],
    ['acara-02', 'Lamaran'],
    ['acara-03', 'Pre-wedding'],
    ['acara-04', 'Wisuda'],
    ['acara-05', 'Photoshoot'],
  ]],
  ['adm-foto-portofolio', [
    ['plat-01', 'Portofolio 01, Soft glam'],
    ['plat-02', 'Portofolio 02, Soft glam'],
    ['plat-03', 'Portofolio 03, Natural'],
    ['plat-04', 'Portofolio 04, Adat'],
    ['plat-05', 'Portofolio 05, Photoshoot'],
    ['plat-06', 'Portofolio 06, Natural'],
    ['plat-07', 'Portofolio 07, Kids makeup'],
    ['plat-08', 'Portofolio 08, Soft glam'],
    ['plat-09', 'Portofolio 09, Di balik layar'],
  ]],
  ['adm-foto-tentang', [
    ['perias', 'Foto perias'],
  ]],
];

const el = (id) => document.getElementById(id);
let alamatBucket = '';

function buat(tag, kelas, teks) {
  const n = document.createElement(tag);
  if (kelas) n.className = kelas;
  if (teks !== undefined) n.textContent = teks;
  return n;
}

function baris(slot, nama, data) {
  const wadah = buat('div', 'adm-foto-baris');
  wadah.id = 'fb-' + slot;

  if (data.berkas) {
    const img = buat('img');
    img.src = alamatBucket + data.berkas;
    img.alt = data.alt || '';
    img.width = 72; img.height = 90;
    wadah.appendChild(img);
  } else {
    wadah.appendChild(buat('div', 'adm-foto-kosong', 'belum diisi'));
  }

  const kanan = buat('div');
  kanan.appendChild(buat('p', 'fine', nama));

  const bidang = buat('div', 'field');
  const lab = buat('label', null, 'Keterangan foto, wajib diisi');
  lab.setAttribute('for', 'alt-' + slot);
  const inp = buat('input');
  inp.type = 'text'; inp.id = 'alt-' + slot;
  inp.value = data.alt || '';
  bidang.appendChild(lab); bidang.appendChild(inp);
  kanan.appendChild(bidang);

  const aksi = buat('div', 'adm-foto-aksi');
  const berkas = buat('input');
  berkas.type = 'file'; berkas.accept = 'image/*'; berkas.id = 'file-' + slot;
  const simpan = buat('button', 'btn btn--primary', 'Unggah');
  simpan.type = 'button'; simpan.id = 'unggah-' + slot;
  simpan.addEventListener('click', () => unggah(slot));
  aksi.appendChild(berkas); aksi.appendChild(simpan);

  if (data.berkas) {
    const hapus = buat('button', 'btn btn--quiet', 'Hapus');
    hapus.type = 'button';
    hapus.addEventListener('click', () => hapusFoto(slot));
    aksi.appendChild(hapus);
  }
  kanan.appendChild(aksi);

  const kabar = buat('div', 'outcome');
  kabar.id = 'kabar-' + slot;
  kabar.setAttribute('data-state', 'empty');
  kabar.setAttribute('role', 'status');
  kabar.setAttribute('aria-live', 'polite');
  kabar.hidden = true;
  kanan.appendChild(kabar);

  wadah.appendChild(kanan);
  return wadah;
}

export async function muatFoto() {
  const wadah = GRUP.map(([id]) => el(id));

  // Seluruh baris dibangun ulang di sini, termasuk kotak kabarnya. Pemantau
  // yang masih hidup akan menulis ke kotak yang sudah dibuang dari halaman,
  // jadi pesannya tidak akan pernah terlihat siapa pun. Lebih baik
  // dihentikan daripada dibiarkan menengok situs tanpa tempat bicara.
  hentikanPantau();

  wadah.forEach((w) => {
    w.replaceChildren(buat('p', 'fine', 'Mengambil data foto...'));
  });

  alamatBucket = import.meta.env.PUBLIC_SUPABASE_URL.replace(/\/+$/, '') +
    '/storage/v1/object/public/foto/';

  let data;
  try {
    const r = await supabase.from('foto').select('slot, berkas, alt, lebar, tinggi');
    if (r.error) throw r.error;
    data = r.data;
  } catch (e) {
    // Kabar galat ditulis ke SETIAP wadah, bukan ke satu wadah saja. Isi tab
    // yang tidak aktif tersembunyi, jadi kabar yang hanya ditulis di satu tab
    // akan membuat empat tab lain tampak kosong tanpa sebab.
    const sebab = terjemah(e.message || String(e));
    wadah.forEach((w) => {
      const k = buat('div', 'outcome');
      k.setAttribute('data-state', 'error');
      k.appendChild(buat('p', 'outcome__title', 'Gagal mengambil data foto'));
      k.appendChild(buat('p', 'outcome__text', sebab));
      w.replaceChildren(k);
    });
    return;
  }

  const peta = new Map(data.map((r) => [r.slot, r]));
  GRUP.forEach(([, isi], i) => {
    const w = wadah[i];
    w.replaceChildren();
    for (const [slot, nama] of isi) {
      w.appendChild(baris(slot, nama, peta.get(slot) || {}));
    }
  });
}

function kabar(slot, state, judul, teks) {
  const k = el('kabar-' + slot);
  k.hidden = false;
  tulisKabar(k, state, judul, teks);
  return k;
}

async function unggah(slot) {
  const berkas = el('file-' + slot).files[0];
  const alt = el('alt-' + slot).value.trim();
  const tombol = el('unggah-' + slot);

  if (!alt) {
    kabar(slot, 'error', 'Keterangan foto wajib diisi',
      'Pembaca layar membacakannya untuk orang yang tidak bisa melihat foto. Satu kalimat pendek sudah cukup.');
    el('alt-' + slot).focus();
    return;
  }
  if (!berkas) {
    kabar(slot, 'error', 'Belum ada berkas dipilih', 'Pilih satu foto dulu.');
    return;
  }

  tombol.disabled = true;
  kabar(slot, 'empty', 'Menyiapkan foto', 'Mengecilkan sebelum dikirim.');

  let hasil;
  try {
    hasil = await kecilkan(berkas);
  } catch (e) {
    tombol.disabled = false;
    kabar(slot, 'error', 'Foto ditolak', e.message);
    return;
  }

  const nama = slot + '-' + Date.now() + '.jpg';
  kabar(slot, 'empty', 'Mengunggah',
    Math.round(hasil.blob.size / 1024) + ' KB, ' + hasil.lebar + ' kali ' + hasil.tinggi + ' piksel.');

  try {
    const u = await supabase.storage.from('foto')
      .upload(nama, hasil.blob, { contentType: 'image/jpeg' });
    if (u.error) throw u.error;

    const lama = (await supabase.from('foto').select('berkas').eq('slot', slot).single()).data;

    const s = await supabase.from('foto')
      .update({ berkas: nama, alt, lebar: hasil.lebar, tinggi: hasil.tinggi })
      .eq('slot', slot).select('diperbarui').single();
    if (s.error) throw s.error;

    // Berkas lama dihapus SESUDAH baris menunjuk yang baru. Kalau urutannya
    // dibalik dan penyimpanan gagal, situs kehilangan fotonya.
    if (lama && lama.berkas && lama.berkas !== nama) {
      await supabase.storage.from('foto').remove([lama.berkas]);
    }

    tombol.disabled = false;
    const k = kabar(slot, 'ready', 'Tersimpan', 'Situs sedang dibangun ulang, sekitar dua menit.');
    if (s.data && s.data.diperbarui) {
      // Halaman hanya bisa memantau satu build sekaligus. Mengunggah foto
      // berikutnya memindahkan pemantauan ke baris yang baru, dan baris yang
      // tadi dipantau diberi pesan pelepasan oleh pantauBuild, bukan
      // dibiarkan menggantung selamanya di "Tersimpan".
      pantauBuild(k, s.data.diperbarui);
    } else {
      kabar(slot, 'ready', 'Tersimpan, tapi build tidak bisa dipantau',
        'Perubahan sudah masuk basis data. Periksa situs beberapa menit lagi.');
    }
  } catch (e) {
    tombol.disabled = false;
    kabar(slot, 'error', 'Gagal mengunggah', terjemah(e.message || String(e)));
  }
}

async function hapusFoto(slot) {
  try {
    const lama = (await supabase.from('foto').select('berkas').eq('slot', slot).single()).data;
    const s = await supabase.from('foto')
      .update({ berkas: null, alt: null, lebar: null, tinggi: null })
      .eq('slot', slot).select('diperbarui').single();
    if (s.error) throw s.error;
    if (lama && lama.berkas) {
      await supabase.storage.from('foto').remove([lama.berkas]);
    }
    // Daftar dibangun ulang dulu supaya pratinjaunya hilang, kabarnya ditulis
    // sesudah itu. Tanpa kabar ini, menghapus foto tidak memberi tanda apa
    // pun padahal ia juga memicu build ulang.
    await muatFoto();
    const k = kabar(slot, 'ready', 'Terhapus',
      'Situs sedang dibangun ulang, sekitar dua menit.');
    if (s.data && s.data.diperbarui) {
      pantauBuild(k, s.data.diperbarui);
    } else {
      kabar(slot, 'ready', 'Terhapus, tapi build tidak bisa dipantau',
        'Perubahan sudah masuk basis data. Periksa situs beberapa menit lagi.');
    }
  } catch (e) {
    kabar(slot, 'error', 'Gagal menghapus', terjemah(e.message || String(e)));
  }
}

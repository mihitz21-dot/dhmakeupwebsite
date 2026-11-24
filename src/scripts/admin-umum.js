// Supabase mengirim pesan galatnya dalam bahasa Inggris. Seluruh situs ini
// berbahasa Indonesia, jadi yang sudah dikenali diterjemahkan. Yang belum
// dikenali TIDAK ditelan: pesan aslinya tetap ikut ditampilkan, supaya galat
// yang tak terduga tetap bisa dilacak dan bukan berubah jadi "gagal" kosong.
const PESAN = {
  'Invalid login credentials': 'Email atau kata sandi salah.',
  'Email not confirmed': 'Email ini belum dikonfirmasi.',
  'User not found': 'Akun dengan email ini tidak ada.',
  'Failed to fetch': 'Tidak bisa menghubungi server. Periksa koneksi internet, atau project Supabase sedang dijeda.',
  'Email logins are disabled': 'Login dengan email sedang dimatikan di pengaturan Supabase.',
  'Signups not allowed for this instance': 'Pendaftaran akun baru dimatikan.',
};

export function terjemah(pesan) {
  if (PESAN[pesan]) return PESAN[pesan];
  if (/rate limit|too many requests/i.test(pesan)) {
    return 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.';
  }
  return 'Sebabnya: ' + pesan;
}

// Nilai dari basis data dan pesan galat tidak pernah dirangkai ke dalam
// string HTML. Judul dan isi dipasang lewat textContent, jadi tanda kutip
// atau tanda kurung sudut di dalamnya tidak bisa berubah jadi markup.
export function tulisKabar(wadah, state, judul, teks) {
  wadah.setAttribute('data-state', state);
  wadah.textContent = '';
  const h = document.createElement('p');
  h.className = 'outcome__title';
  h.textContent = judul;
  wadah.appendChild(h);
  if (teks) {
    const t = document.createElement('p');
    t.className = 'outcome__text';
    t.textContent = teks;
    wadah.appendChild(t);
  }
}

export function kabarPenuh(wadah, state, judul, teks) {
  const kotak = document.createElement('div');
  kotak.className = 'outcome';
  tulisKabar(kotak, state, judul, teks);
  wadah.replaceChildren(kotak);
}

// Satu pegangan timer untuk seluruh modul. Tanpa ini, menekan Simpan dua
// kali membuat dua putaran berjalan sekaligus dan saling menimpa pesan di
// layar. `sesiPantau` membatalkan putaran yang fetch-nya masih di udara saat
// pemantauan dihentikan, karena clearTimeout tidak bisa menarik kembali
// fetch yang sudah berjalan.
let timerPantau = null;
let sesiPantau = 0;
// Kotak kabar yang sedang dipantau, supaya pemantau berikutnya bisa
// memberitahu kotak ini bahwa pemantauannya dilepas. Tanpa itu kotak lama
// berhenti selamanya di "Tersimpan" dan pemilik situs akan menyangka
// penyimpanannya gagal, padahal yang berhenti cuma pemantauannya.
let wadahPantau = null;

export function hentikanPantau() {
  if (timerPantau !== null) clearTimeout(timerPantau);
  timerPantau = null;
  wadahPantau = null;
  sesiPantau += 1;
}

// Penanda `dibangun` hanya membuktikan ada build BARU yang sedang disajikan,
// bukan bahwa build itu membawa nilai yang baru disimpan: sebuah build yang
// sudah berjalan bisa saja membaca basis data sesaat SEBELUM penyimpanan,
// jadi penandanya berubah sementara isinya masih nilai lama. Karena itu yang
// dibandingkan adalah waktu, bukan beda-tidak-beda. Sebuah build dianggap
// membawa perubahan hanya kalau ia dibangun SESUDAH baris itu diperbarui.
export function tayang(dibangun, diperbarui) {
  if (!dibangun || !diperbarui) return false;
  const b = new Date(dibangun).getTime();
  const d = new Date(diperbarui).getTime();
  if (Number.isNaN(b) || Number.isNaN(d)) return false;
  return b > d;
}

export async function ambilPenanda(situs) {
  try {
    const r = await fetch(situs + '/?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const teks = await r.text();
    const m = teks.match(/name="dibangun" content="([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function pantauBuild(hasil, diperbarui) {
  // Mengunggah foto kedua, atau menyimpan pengaturan sambil foto masih
  // dipantau, memindahkan satu-satunya pemantau ke tempat yang baru. Yang
  // lama diberi pesan jujur dulu: datanya aman, dan build yang sekarang
  // dipantau juga membawa perubahan ini karena ia dibangun sesudahnya.
  const sebelumnya = wadahPantau;
  hentikanPantau();
  if (sebelumnya && sebelumnya !== hasil) {
    tulisKabar(sebelumnya, 'ready', 'Tersimpan, pemantauannya dilepas',
      'Perubahan ini sudah masuk basis data dan tidak hilang. Halaman ini ' +
      'memantau satu build sekaligus, dan sekarang yang dipantau adalah ' +
      'perubahan terbaru. Build itu membawa perubahan ini juga.');
  }
  wadahPantau = hasil;
  const sesi = sesiPantau;
  const situs = location.origin;
  const mulaiPantau = Date.now();
  const batas = 5 * 60 * 1000;
  const selang = 10000;

  // setInterval dengan callback async bisa menumpuk: kalau satu fetch lebih
  // lama dari selangnya, selang berikutnya tetap tiba dan panggilannya
  // bertumpuk. Putaran ini menjadwalkan dirinya sendiri sesudah fetch
  // selesai, jadi tidak pernah ada dua pengambilan sekaligus.
  const putaran = async () => {
    const kini = await ambilPenanda(situs);
    if (sesi !== sesiPantau) return;

    if (tayang(kini, diperbarui)) {
      timerPantau = null;
      wadahPantau = null;
      tulisKabar(hasil, 'ready', 'Sudah tayang',
        'Situs selesai dibangun ulang pada ' + kini + '.');
      return;
    }

    // Batas lima menit disengaja: tanpa itu halaman menengok selamanya kalau
    // build gagal, dan pemilik situs tidak pernah diberi tahu apa pun.
    if (Date.now() - mulaiPantau > batas) {
      timerPantau = null;
      wadahPantau = null;
      tulisKabar(hasil, 'ready', 'Tersimpan, tapi build belum terdeteksi',
        'Perubahan sudah masuk basis data dan tidak hilang. Yang belum ' +
        'terdeteksi hanya build ulangnya. Periksa tab Deployments di Vercel.');
      return;
    }

    timerPantau = setTimeout(putaran, selang);
  };

  timerPantau = setTimeout(putaran, selang);
}

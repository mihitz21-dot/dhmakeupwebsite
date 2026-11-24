// Nomor Indonesia ditulis orang dengan banyak bentuk: 0852..., +62 852...,
// 62852..., kadang pakai spasi atau tanda hubung. Yang membacanya menuntut
// bentuk yang berbeda-beda, dan salah bentuk GAGAL DIAM-DIAM:
//
//   wa.me/6285210009795  -> WhatsApp mengenali nomornya
//   wa.me/085210009795   -> halaman perantara biasa, tidak sampai ke chat,
//                           dan jawabannya tetap HTTP 200 sehingga tidak ada
//                           yang curiga
//
// Karena itu normalisasinya tinggal di satu tempat. Dua tempat berarti suatu
// hari yang satu diperbaiki dan yang lain tidak.

/** Mengubah nomor apa pun menjadi digit E.164 tanpa tanda plus, misalnya
 *  "6285210009795". Mengembalikan null kalau tidak masuk akal sebagai nomor. */
export function nomorE164(mentah: string | null | undefined): string | null {
  if (!mentah) return null;
  let a = String(mentah).replace(/\D/g, '');
  if (!a) return null;

  if (a.startsWith('620')) a = '62' + a.slice(3);   // 62 085... salah ketik umum
  else if (a.startsWith('62')) { /* sudah benar */ }
  else if (a.startsWith('0')) a = '62' + a.slice(1);
  else if (a.startsWith('8')) a = '62' + a;          // 852... tanpa nol
  else return null;                                  // kode negara lain, biarkan

  // Nomor seluler Indonesia: 62 ditambah 9 sampai 12 digit.
  if (a.length < 11 || a.length > 14) return null;
  return a;
}

/** Alamat wa.me. wa.me TIDAK menerima tanda plus maupun nol di depan. */
export function tautanWhatsApp(mentah: string | null | undefined): string | null {
  const a = nomorE164(mentah);
  return a ? 'https://wa.me/' + a : null;
}

/** Bentuk untuk schema dan tel:, yang justru MENUNTUT tanda plus. */
export function teleponPlus(mentah: string | null | undefined): string | null {
  const a = nomorE164(mentah);
  return a ? '+' + a : null;
}

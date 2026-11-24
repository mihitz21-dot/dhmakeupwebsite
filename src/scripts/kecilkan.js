// Mengecilkan foto di peramban sebelum diunggah. Berkas kamera 3 sampai 8 MB
// jadi sekitar 200 sampai 400 KB. Tiga sebabnya: unggah tetap berhasil walau
// sinyal lemah, kuota Storage 1 GB tidak cepat habis, dan pengunjung berkuota
// terbatas tidak perlu mengunduh foto raksasa untuk bingkai kecil.
export const MAKS_SISI = 1600;
export const MAKS_BYTE = 500 * 1024;
export const MUTU = 0.82;

export function ukuranBaru(lebar, tinggi, maks = MAKS_SISI) {
  if (!lebar || !tinggi) return { lebar: 0, tinggi: 0 };
  const sisi = Math.max(lebar, tinggi);
  if (sisi <= maks) return { lebar, tinggi };
  const skala = maks / sisi;
  return {
    lebar: Math.max(1, Math.round(lebar * skala)),
    tinggi: Math.max(1, Math.round(tinggi * skala)),
  };
}

export async function kecilkan(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    throw new Error('Berkas ini bukan gambar.');
  }

  let bitmap;
  try {
    // createImageBitmap menghormati metadata arah putar dari ponsel, sehingga
    // foto tidak tiba-tiba miring setelah diunggah.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Gambar tidak bisa dibaca. Coba simpan ulang sebagai JPG lalu unggah lagi.');
  }

  const { lebar, tinggi } = ukuranBaru(bitmap.width, bitmap.height);
  const kanvas = document.createElement('canvas');
  kanvas.width = lebar;
  kanvas.height = tinggi;
  const ctx = kanvas.getContext('2d');
  // Kanvas dimulai transparan dan JPEG tidak mengenal transparansi, sehingga
  // bagian transparan jatuh ke HITAM saat disimpan. Bucket menerima PNG, jadi
  // tanpa alas putih ini sebuah PNG berlatar transparan akan tampil berlatar
  // hitam di situs, dan sebabnya tidak akan jelas bagi siapa pun.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, lebar, tinggi);
  ctx.drawImage(bitmap, 0, 0, lebar, tinggi);
  bitmap.close();

  const blob = await new Promise((res) => kanvas.toBlob(res, 'image/jpeg', MUTU));
  if (!blob) throw new Error('Gagal menyiapkan gambar di peramban ini.');
  if (blob.size > MAKS_BYTE) {
    throw new Error(
      'Hasilnya masih ' + Math.round(blob.size / 1024) + ' KB, lebih dari batas ' +
      Math.round(MAKS_BYTE / 1024) + ' KB. Coba foto dengan ukuran lebih kecil.'
    );
  }
  return { blob, lebar, tinggi };
}

"""Uji kecilkan() di peramban sungguhan, lewat Playwright.

    python tools/verify/uji_kecilkan_peramban.py

Berdiri sendiri: menyalin src/scripts/kecilkan.js ke folder sementara, membuat
halaman pemuatnya, menyalakan server di port acak, lalu menjalankan fungsinya
di Chromium. Kode TIDAK disalin isinya, berkasnya yang dipakai, jadi uji ini
ikut berubah kalau berkas itu disunting.

uji_kecilkan.mjs hanya menguji ukuranBaru(), yang murni hitungan. Fungsi
kecilkan() menyentuh kanvas dan hanya bisa diuji di peramban, dan di situlah
cacat yang paling merugikan bersembunyi: tanpa alas putih, PNG berlatar
transparan tersimpan berlatar HITAM, karena kanvas dimulai transparan dan JPEG
tidak mengenal transparansi.
"""
import sys, os, shutil, tempfile, socket, subprocess, time, json

HAL = """<!DOCTYPE html><html><head><meta charset="utf-8"><title>uji</title></head>
<body><script type="module">
import { kecilkan } from './kecilkan.js';
window.kecilkan = kecilkan; window.siap = true;
</script></body></html>"""

SKRIP = """async () => {
  const c = document.createElement('canvas'); c.width = 600; c.height = 400;
  const x = c.getContext('2d');
  x.fillStyle = 'red'; x.fillRect(200, 150, 200, 100);
  const png = await new Promise(r => c.toBlob(r, 'image/png'));
  const out = await window.kecilkan(new File([png], 'a.png', { type: 'image/png' }));
  const bm = await createImageBitmap(out.blob);
  const c2 = document.createElement('canvas'); c2.width = bm.width; c2.height = bm.height;
  const x2 = c2.getContext('2d'); x2.drawImage(bm, 0, 0);
  const pj = x2.getImageData(2, 2, 1, 1).data;
  const tg = x2.getImageData(Math.round(bm.width/2), Math.round(bm.height/2), 1, 1).data;

  let besar = null;
  const cb = document.createElement('canvas'); cb.width = 4000; cb.height = 3000;
  const xb = cb.getContext('2d');
  const g = xb.createLinearGradient(0, 0, 4000, 3000);
  g.addColorStop(0, '#8A4853'); g.addColorStop(1, '#F7F1EC');
  xb.fillStyle = g; xb.fillRect(0, 0, 4000, 3000);
  const jb = await new Promise(r => cb.toBlob(r, 'image/jpeg', 1));
  const ob = await window.kecilkan(new File([jb], 'b.jpg', { type: 'image/jpeg' }));
  besar = { lebar: ob.lebar, tinggi: ob.tinggi, byte: ob.blob.size, asal: jb.size };

  let tolak = 'TIDAK DITOLAK';
  try { await window.kecilkan(new File(['halo'], 'a.txt', { type: 'text/plain' })); }
  catch (e) { tolak = e.message; }

  return { tipe: out.blob.type, pojok: [pj[0],pj[1],pj[2]], tengah: [tg[0],tg[1],tg[2]],
           besar, tolak };
}"""

def port_bebas():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

def main(sumber="src/scripts/kecilkan.js"):
    from playwright.sync_api import sync_playwright
    kerja = tempfile.mkdtemp(prefix="ujikecil-")
    shutil.copy(sumber, os.path.join(kerja, "kecilkan.js"))
    open(os.path.join(kerja, "i.html"), "w", encoding="utf-8").write(HAL)
    port = port_bebas()
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1",
                            "--directory", kerja], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    gagal = []
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(); pg = b.new_page()
            pg.goto(f"http://127.0.0.1:{port}/i.html", wait_until="networkidle")
            pg.wait_for_function("window.siap === true", timeout=15000)
            h = pg.evaluate(SKRIP)
            b.close()
    finally:
        srv.terminate(); shutil.rmtree(kerja, ignore_errors=True)

    def cek(nama, ok, detail):
        print(f"  {'lulus' if ok else 'GAGAL'}  {nama}: {detail}")
        if not ok: gagal.append(nama)

    cek("keluaran bertipe image/jpeg", h["tipe"] == "image/jpeg", h["tipe"])
    cek("area transparan jadi PUTIH, bukan hitam",
        all(v > 245 for v in h["pojok"]), f"piksel pojok {h['pojok']}")
    cek("isi gambar tidak rusak", h["tengah"][0] > 200 and h["tengah"][1] < 40,
        f"piksel tengah {h['tengah']}")
    bs = h["besar"]
    cek("foto besar dikecilkan ke sisi 1600",
        max(bs["lebar"], bs["tinggi"]) == 1600, f"{bs['lebar']}x{bs['tinggi']}")
    cek("hasilnya di bawah 500 KB", bs["byte"] <= 500 * 1024,
        f"{bs['byte'] // 1024} KB dari asal {bs['asal'] // 1024} KB")
    cek("berkas bukan gambar ditolak berbahasa Indonesia",
        "bukan gambar" in h["tolak"], repr(h["tolak"]))

    print(f"uji_kecilkan_peramban: {len(gagal)} masalah")
    return 1 if gagal else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "src/scripts/kecilkan.js"))

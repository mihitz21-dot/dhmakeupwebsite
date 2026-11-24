"""Pemeriksaan statis atas berkas HTML hasil build."""
import sys, re, os, glob

HALAMAN = ["index", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]
# Invarian jumlah kata sudah DIPENSIUNKAN, dan itu disengaja.
#
# Angkanya dulu 637, 484, 704, 614, 310, 518, dan 325. Tugasnya membuktikan
# bahwa pemindahan situs lama ke Astro tidak mengubah satu kata pun, dan tugas
# itu selesai: tujuh halaman terbukti identik, termasuk tangkapan layar yang
# sama byte demi byte.
#
# Angka-angka itu hanya berlaku selama tabel `pengaturan` masih kosong. Begitu
# nomor WhatsApp diisi lewat halaman admin, cip "[NOMOR WHATSAPP]" yang dua kata
# berubah menjadi tautan satu kata, dan ketujuh angka bergeser. Itu memang yang
# diinginkan, bukan regresi. Mempertahankannya berarti gerbang ini akan merah
# setiap kali pemilik situs mengubah pengaturannya, dan gerbang yang selalu
# merah akan diabaikan orang sampai ia berhenti berguna sama sekali.
#
# Penjaga yang tersisa di berkas ini adalah struktur: jumlah h1, jumlah section,
# jumlah bingkai foto, tautan mati, em dash, atribut lang, dan zoom. Ketujuhnya
# tidak ikut bergeser saat data berubah. Pemeriksaan isi yang lebih dalam ada di
# check_browser.py dan check_interactions.py.
# Kolom "ph" menghitung POSISI foto, bukan bingkai placeholder. Tiap posisi
# menggambar tepat satu hal: placeholder selama kolom `berkas` masih null, lalu
# sebuah <img> begitu foto diunggah lewat halaman admin. Kalau hanya
# placeholder yang dihitung, gerbang ini merah setiap kali pemilik situs
# mengunggah foto pertamanya, padahal itu justru yang diinginkan. Angkanya
# tetap 10, 9, dan 1 karena jumlah posisi tidak berubah, hanya isinya.
#
# Ini berbeda dari jumlah kata yang dipensiunkan di atas: jumlah kata tidak
# punya bentuk tetap yang bermakna setelah data masuk, sedangkan jumlah posisi
# punya.
INVARIAN = {
    "index":      {"h1": 1, "section": 6, "ph": 10},
    "kontak":     {"h1": 1, "section": 4, "ph": 0},
    "layanan":    {"h1": 1, "section": 5, "ph": 0},
    "paket":      {"h1": 1, "section": 5, "ph": 0},
    "portofolio": {"h1": 1, "section": 3, "ph": 9},
    "tentang":    {"h1": 1, "section": 5, "ph": 1},
    "ulasan":     {"h1": 1, "section": 4, "ph": 0},
}

def cari(root, nama):
    for p in (os.path.join(root, nama, "index.html"),
              os.path.join(root, nama + ".html"),
              os.path.join(root, "index.html") if nama == "index" else ""):
        if p and os.path.exists(p):
            return p
    return None

def main(root):
    gagal = []
    peta = {}
    for nama in HALAMAN:
        p = cari(root, nama)
        if not p:
            gagal.append(f"{nama}: berkas tidak ditemukan di {root}")
            continue
        peta[nama] = (p, open(p, encoding="utf-8").read())

    for nama, (p, s) in peta.items():
        inv = INVARIAN[nama]
        aktual = {
            "h1": len(re.findall(r"<h1", s)),
            "section": len(re.findall(r"<section", s)),
            "ph": (len(re.findall(r'class="ph[ "]', s))
                   + len(re.findall(r"<img ", s))),
        }
        for k, v in inv.items():
            if aktual[k] != v:
                gagal.append(f"{nama}: {k} seharusnya {v}, dapat {aktual[k]}")

        if "—" in s:
            gagal.append(f"{nama}: ada em dash")
        if "<html lang=" not in s:
            gagal.append(f"{nama}: tidak ada atribut lang")
        if "user-scalable=no" in s or "maximum-scale" in s:
            gagal.append(f"{nama}: zoom diblokir")
        for perlu in ["<title>", "<header", "<nav", "<main", "<footer", "skip-link"]:
            if perlu not in s:
                gagal.append(f"{nama}: tidak ada {perlu}")

        prev = 0
        for lv in [int(x) for x in re.findall(r"<h([1-4])", s)]:
            if prev and lv > prev + 1:
                gagal.append(f"{nama}: lompatan heading h{prev} ke h{lv}")
            prev = lv

        for href in re.findall(r'href="([^"]+)"', s):
            if href.startswith(("http", "mailto:", "tel:", "#")):
                if href.startswith("#") and f'id="{href[1:]}"' not in s:
                    gagal.append(f"{nama}: anchor mati {href}")
                continue
            jalur, _, frag = href.partition("#")
            tujuan = jalur.strip("/") or "index"
            if tujuan.endswith(".html"):
                tujuan = tujuan[:-5]
            if tujuan not in peta and os.path.isfile(os.path.join(root, tujuan)):
                continue
            if tujuan not in peta:
                gagal.append(f"{nama}: tautan mati {href}")
            elif frag and f'id="{frag}"' not in peta[tujuan][1]:
                gagal.append(f"{nama}: anchor mati {href}")

    for g in gagal:
        print("GAGAL", g)
    print(f"check_static: {len(gagal)} masalah")
    return 1 if gagal else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "dist"))

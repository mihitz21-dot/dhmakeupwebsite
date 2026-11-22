"""Pemeriksaan statis atas berkas HTML hasil build."""
import sys, re, os, glob, html as htmlmod

HALAMAN = ["index", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]
INVARIAN = {
    "index":      {"h1": 1, "section": 6, "ph": 10, "kata": 642},
    "kontak":     {"h1": 1, "section": 4, "ph": 0,  "kata": 484},
    "layanan":    {"h1": 1, "section": 5, "ph": 0,  "kata": 704},
    "paket":      {"h1": 1, "section": 5, "ph": 0,  "kata": 614},
    "portofolio": {"h1": 1, "section": 3, "ph": 9,  "kata": 310},
    "tentang":    {"h1": 1, "section": 5, "ph": 1,  "kata": 518},
    "ulasan":     {"h1": 1, "section": 4, "ph": 0,  "kata": 343},
}

def teks(s):
    b = s[s.find("<body"):]
    b = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", b, flags=re.S)
    b = re.sub(r"<[^>]+>", " ", b)
    return htmlmod.unescape(b).split()

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
            "ph": len(re.findall(r'class="ph[ "]', s)),
            "kata": len(teks(s)),
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

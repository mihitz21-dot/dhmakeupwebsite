"""Penjaga foto: teks alt, atribut ukuran, dan besar berkas."""
import sys, re, os, glob

HALAMAN = ["index", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]
MAKS_BYTE = 500 * 1024

def cari(root, nama):
    for p in (os.path.join(root, nama, "index.html"),
              os.path.join(root, nama + ".html"),
              os.path.join(root, "index.html") if nama == "index" else ""):
        if p and os.path.exists(p):
            return p
    return None

def main(root):
    gagal = []
    diperiksa = 0

    for nama in HALAMAN:
        p = cari(root, nama)
        if not p:
            gagal.append(f"{nama}: berkas tidak ditemukan di {root}")
            continue
        s = open(p, encoding="utf-8").read()
        for tag in re.findall(r"<img\b[^>]*>", s):
            diperiksa += 1
            alt = re.search(r'\balt="([^"]*)"', tag)
            if not alt:
                gagal.append(f"{nama}: ada gambar tanpa atribut alt: {tag[:120]}")
            elif not alt.group(1).strip():
                gagal.append(f"{nama}: ada gambar dengan alt kosong: {tag[:120]}")
            if not re.search(r'\bwidth="\d+"', tag):
                gagal.append(f"{nama}: gambar tanpa width: {tag[:120]}")
            if not re.search(r'\bheight="\d+"', tag):
                gagal.append(f"{nama}: gambar tanpa height: {tag[:120]}")

    for f in glob.glob(os.path.join(root, "assets", "foto", "*")):
        if f.endswith(".txt"):
            continue
        n = os.path.getsize(f)
        if n > MAKS_BYTE:
            gagal.append(f"{os.path.basename(f)}: {n // 1024} KB, lebih dari batas "
                         f"{MAKS_BYTE // 1024} KB")

    for g in gagal:
        print("GAGAL", g)
    print(f"check_foto: {len(gagal)} masalah, {diperiksa} gambar diperiksa")
    return 1 if gagal else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "dist"))

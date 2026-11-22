"""Bandingkan dua hasil snapshot. Teks wajib identik."""
import sys, os, difflib

HALAMAN = ["index", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]

def main(a, b):
    beda = 0
    for n in HALAMAN:
        fa, fb = f"{a}/text/{n}.txt", f"{b}/text/{n}.txt"
        if not (os.path.exists(fa) and os.path.exists(fb)):
            print("GAGAL", n, "berkas rekaman tidak lengkap"); beda += 1; continue
        ta = open(fa, encoding="utf-8").read().split()
        tb = open(fb, encoding="utf-8").read().split()
        if ta == tb:
            print(f"OK    {n}: teks identik ({len(ta)} kata)")
        else:
            beda += 1
            print(f"GAGAL {n}: teks berbeda ({len(ta)} vs {len(tb)} kata)")
            for baris in list(difflib.unified_diff(ta, tb, lineterm="", n=2))[:40]:
                print("     ", baris)
    print(f"compare: {beda} halaman berbeda")
    return 1 if beda else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")))

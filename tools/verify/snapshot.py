"""Rekam teks terbaca dan tangkapan layar tiap halaman."""
import sys, os, re, html as htmlmod
from playwright.sync_api import sync_playwright

HALAMAN = ["index", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]
LEBAR = [390, 1440]

def url(base, h, ext):
    if ext:
        return f"{base}/index.html" if h in ("", "index") else f"{base}/{h}.html"
    return f"{base}/" if h in ("", "index") else f"{base}/{h}"

def main(base, out, ext=""):
    os.makedirs(f"{out}/text", exist_ok=True)
    os.makedirs(f"{out}/shot", exist_ok=True)

    with sync_playwright() as p:
        b = p.chromium.launch()
        for w in LEBAR:
            c = b.new_context(viewport={"width": w, "height": 900},
                              is_mobile=(w < 500), device_scale_factor=1)
            pg = c.new_page()
            for n in HALAMAN:
                pg.goto(url(base, n, ext), wait_until="networkidle")
                pg.evaluate("() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'))")
                pg.wait_for_timeout(900)
                pg.screenshot(path=f"{out}/shot/{n}-{w}.png", full_page=True)
                if w == LEBAR[-1]:
                    t = pg.evaluate("() => document.body.innerText")
                    norm = " ".join(t.split())
                    open(f"{out}/text/{n}.txt", "w", encoding="utf-8").write(norm)
            c.close()
        b.close()
    print(f"snapshot: tersimpan di {out}")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1].rstrip("/"), sys.argv[2],
                  ".html" if "--html" in sys.argv else ""))

"""Klik-tayang: formulir 4 state, filter galeri, menu ponsel."""
import sys
from playwright.sync_api import sync_playwright

def url(base, h, ext):
    if ext:
        return f"{base}/index.html" if h in ("", "index") else f"{base}/{h}.html"
    return f"{base}/" if h in ("", "index") else f"{base}/{h}"

def main(base, ext=""):
    gagal = []
    konsol = []
    def hal(n):
        return url(base, n, ext)

    with sync_playwright() as p:
        b = p.chromium.launch()
        c = b.new_context(viewport={"width": 1440, "height": 1000})
        c.grant_permissions(["clipboard-read", "clipboard-write"])
        pg = c.new_page()
        pg.on("pageerror", lambda e: konsol.append(f"pageerror: {e}"))
        pg.on("console", lambda m: konsol.append(m.text) if m.type == "error" else None)

        # --- filter galeri ---
        pg.goto(hal("portofolio"), wait_until="networkidle")
        semua = pg.locator("figure[data-look]:visible").count()
        if semua != 9:
            gagal.append(f"filter: seharusnya 9 foto, dapat {semua}")
        pg.get_by_role("button", name="Adat").click()
        pg.wait_for_timeout(300)
        if pg.locator("figure[data-look]:visible").count() != 1:
            gagal.append("filter Adat: seharusnya 1 foto")
        if pg.get_by_role("button", name="Adat").get_attribute("aria-pressed") != "true":
            gagal.append("filter Adat: aria-pressed tidak true")
        # kategori kosong
        pg.get_by_role("button", name="Semua").click()
        pg.wait_for_timeout(200)
        pg.evaluate("() => document.querySelector('[data-look=\"adat\"]').setAttribute('data-look','natural')")
        pg.get_by_role("button", name="Adat").click()
        pg.wait_for_timeout(300)
        if not pg.locator("#gallery-empty").is_visible():
            gagal.append("filter: kategori kosong tidak memunculkan empty state")

        # --- formulir ---
        pg.goto(hal("kontak"), wait_until="networkidle")
        out = pg.locator("#booking-outcome")
        if out.get_attribute("data-state") != "empty":
            gagal.append("formulir: state awal bukan empty")
        pg.locator("#booking-submit").click()
        pg.wait_for_timeout(400)
        if out.get_attribute("data-state") != "error":
            gagal.append("formulir kosong: state bukan error")
        for f in ["nama", "wa", "tanggal", "consent"]:
            if not pg.locator(f"#err-{f}").inner_text().strip():
                gagal.append(f"formulir: tidak ada pesan error untuk {f}")
        pg.fill("#f-nama", "Rani"); pg.fill("#f-wa", "12345")
        pg.fill("#f-tanggal", "2020-01-01"); pg.check("#f-consent")
        pg.locator("#booking-submit").click(); pg.wait_for_timeout(400)
        if "lewat" not in pg.locator("#err-tanggal").inner_text():
            gagal.append("formulir: tanggal lampau tidak ditolak")
        pg.fill("#f-wa", "081234567890"); pg.fill("#f-tanggal", "2027-06-12")
        pg.locator("#booking-submit").click(); pg.wait_for_timeout(700)
        if out.get_attribute("data-state") != "ready":
            gagal.append("formulir valid: state bukan ready")
        pg.get_by_role("button", name="Salin pesan").click()
        pg.wait_for_timeout(500)
        if "Tersalin" not in pg.locator("#copy-status").inner_text():
            gagal.append("formulir: salin pesan gagal")
        c.close()

        # --- menu ponsel ---
        m = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        mp = m.new_page()
        mp.on("pageerror", lambda e: konsol.append(f"mobile pageerror: {e}"))
        mp.goto(hal("index"), wait_until="networkidle")
        if not mp.locator("#nav-sheet").is_hidden():
            gagal.append("menu: sheet tidak tersembunyi saat muat")
        mp.locator("#nav-open").click(); mp.wait_for_timeout(300)
        if not mp.locator("#nav-sheet").is_visible():
            gagal.append("menu: tidak terbuka")
        if mp.locator("#nav-open").get_attribute("aria-expanded") != "true":
            gagal.append("menu: aria-expanded tidak true")
        mp.keyboard.press("Escape"); mp.wait_for_timeout(300)
        if not mp.locator("#nav-sheet").is_hidden():
            gagal.append("menu: Escape tidak menutup")
        if mp.evaluate("() => document.activeElement.id") != "nav-open":
            gagal.append("menu: fokus tidak kembali ke pemicu")
        m.close()
        b.close()

    for g in gagal:
        print("GAGAL", g)
    for k in konsol:
        print("KONSOL", k)
    print(f"check_interactions: {len(gagal)} masalah, {len(konsol)} error konsol")
    return 1 if (gagal or konsol) else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1].rstrip("/"), ".html" if "--html" in sys.argv else ""))

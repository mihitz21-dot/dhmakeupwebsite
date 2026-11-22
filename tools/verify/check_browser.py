"""Kontras WCAG AA, target sentuh, dan overflow horizontal."""
import sys
from playwright.sync_api import sync_playwright

HALAMAN = ["", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]

def url(base, h, ext):
    if ext:
        return f"{base}/index.html" if h in ("", "index") else f"{base}/{h}.html"
    return f"{base}/" if h in ("", "index") else f"{base}/{h}"

TAP = """() => [...document.querySelectorAll('a[href],button,input,select,textarea,summary')]
  .filter(e => {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const p = e.closest('p, blockquote, .faq__body, .hero__caption');
    if (e.tagName === 'A' && p && getComputedStyle(e).display === 'inline') return false;
    if (e.type === 'checkbox') {
      const lab = document.querySelector('label[for="' + e.id + '"]');
      if (lab && lab.getBoundingClientRect().height >= 44) return false;
    }
    return r.height < 44;
  })
  .map(e => e.tagName + ':' + (e.textContent || e.type || '').trim().slice(0, 22)
            + '/' + Math.round(e.getBoundingClientRect().height))"""

CONTRAST = """() => {
  const lum = c => {
    const [r,g,b] = c.match(/\\d+(\\.\\d+)?/g).slice(0,3).map(Number).map(v => {
      v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  };
  const bgOf = el => {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg;
      n = n.parentElement;
    }
    return 'rgb(255,255,255)';
  };
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const size = parseFloat(cs.fontSize), weight = +cs.fontWeight || 400;
    const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5;
    const l1 = lum(cs.color), l2 = lum(bgOf(el));
    const ratio = (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
    if (ratio < need) bad.push({t: el.textContent.trim().slice(0,34),
      size: Math.round(size), color: cs.color, bg: bgOf(el),
      ratio: +ratio.toFixed(2), need});
  }
  return bad;
}"""

def main(base, ext=""):
    gagal = []
    with sync_playwright() as p:
        b = p.chromium.launch()

        m = b.new_context(viewport={"width": 360, "height": 740}, is_mobile=True, has_touch=True)
        mp = m.new_page()
        for h in HALAMAN:
            mp.goto(url(base, h, ext), wait_until="networkidle")
            kecil = mp.evaluate(TAP)
            if kecil:
                gagal.append(f"/{h}: target sentuh di bawah 44px: {kecil}")
        mp.set_viewport_size({"width": 320, "height": 700})
        for h in HALAMAN:
            mp.goto(url(base, h, ext), wait_until="networkidle")
            ow = mp.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if ow > 0:
                gagal.append(f"/{h}: overflow horizontal {ow}px pada 320px")
        m.close()

        d = b.new_context(viewport={"width": 1440, "height": 1000})
        dp = d.new_page()
        for h in HALAMAN:
            dp.goto(url(base, h, ext), wait_until="networkidle")
            dp.evaluate("() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'))")
            dp.wait_for_timeout(1200)
            buruk = dp.evaluate(CONTRAST)
            if buruk:
                gagal.append(f"/{h}: kontras di bawah AA: {buruk}")
        d.close()
        b.close()

    for g in gagal:
        print("GAGAL", g)
    print(f"check_browser: {len(gagal)} masalah")
    return 1 if gagal else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1].rstrip("/"), ".html" if "--html" in sys.argv else ""))

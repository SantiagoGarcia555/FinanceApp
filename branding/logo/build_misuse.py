"""Ejemplos de usos incorrectos del logo para la guía (no son assets de producción)."""
import re, pathlib
ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "misuse"; OUT.mkdir(exist_ok=True)
src = (ROOT / "final" / "tino-horizontal-color.svg").read_text(encoding="utf-8")
inner = re.search(r"<svg[^>]*>(.*)</svg>", src, re.S).group(1)
inner = re.sub(r"<title>.*?</title>", "", inner)
W, H = 920, 380   # lienzo de cada ejemplo (aspecto de la caja de Canva ≈ 2.42)
def wrap(body, defs="", bg=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs>{defs}</defs>{bg}{body}</svg>'
logo = lambda t: f'<g transform="{t}">{inner}</g>'
base = "translate(116 62) scale(1.0)"   # logo 688x256 centrado
ex = {
 "01-deformar": wrap(logo("translate(40 110) scale(1.22 0.62)")),
 "02-rotar": wrap(logo("rotate(-18 460 190) translate(116 62)")),
 "03-recolorear": wrap(logo(base).replace("#1F3D2B", "#2F6FD6").replace("#D9653B", "#9B4DCA")),
 "04-separar": wrap(logo(base).replace('cy="100.50"', 'cy="10"', 1)),
 "05-efectos": wrap(f'<g filter="url(#s)">{logo(base)}</g>',
                    defs='<filter id="s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="10" dy="14" stdDeviation="6" flood-color="#000" flood-opacity="0.55"/></filter>'),
 "06-ruido": wrap(logo(base), defs='<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="40" height="40" fill="#F2B33D"/><rect width="20" height="40" fill="#D9653B"/></pattern>',
                  bg=f'<rect width="{W}" height="{H}" rx="24" fill="url(#p)"/>'),
}
for k, v in ex.items(): (OUT / f"{k}.svg").write_text(v, encoding="utf-8")
print(list(ex))

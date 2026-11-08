"""Genera los 3 conceptos de logo de Tino (símbolo + lockup) en negro."""
import json, re, pathlib
W = pathlib.Path(__file__).parent
g = json.load(open(W / "tino-600.json"))

def split_subpaths(d):
    return [s.strip() + "Z" for s in d.split("Z") if s.strip()]

def wordmark(dot_circle=False):
    """Devuelve (paths, bbox) del wordmark en unidades de fuente (y hacia abajo)."""
    out = []
    for gl in g["glyphs"]:
        subs = split_subpaths(gl["d"])
        if gl["ch"] == "i" and dot_circle:
            # el punto de la i es el subpath cuyo y máximo es más alto (más negativo)
            def ymax(s):
                ys = [float(v) for v in re.findall(r"-?\d+\.?\d*", s)[1::2]]
                return max(ys)
            subs.sort(key=ymax)
            subs = subs[1:]  # quita el punto
        out.extend(subs)
    return " ".join(out)

def svg(w, h, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><title>{title}</title>{body}</svg>\n'

# ---------- A: El punto justo ----------
# cuenco (media corona con remates redondos) + punto centrado dentro
cx, cy, R, r = 128, 93, 92, 60
cap = (R - r) / 2
bowl = (f"M {cx-R} {cy} A {R} {R} 0 0 0 {cx+R} {cy} "
        f"A {cap} {cap} 0 0 0 {cx+r} {cy} "
        f"A {r} {r} 0 0 1 {cx-r} {cy} "
        f"A {cap} {cap} 0 0 0 {cx-R} {cy} Z")
dot_r = 34
A_sym = f'<path d="{bowl}"/><circle cx="{cx}" cy="{cy+12}" r="{dot_r}"/>'
(W / "a-symbol.svg").write_text(svg(256, 256, A_sym, "Tino A simbolo"))

# ---------- B: t brote ----------
B_parts = [
    '<rect x="85" y="110" width="44" height="68"/>',                       # tallo (bajo el travesaño)
    '<path d="M 85 176 A 62 62 0 0 0 147 238 L 147 194 A 18 18 0 0 1 129 176 Z"/>',  # pie curvo
    '<rect x="146" y="194" width="22" height="44"/><circle cx="168" cy="216" r="22"/>',  # remate del pie
    '<rect x="63" y="96" width="118" height="42" rx="21"/>',              # travesaño
    '<path d="M 104 112 A 84 84 0 0 1 186 22 A 84 84 0 0 1 104 112 Z"/>',   # brote = ascendente
]
B_sym = '<g transform="translate(4 4)">' + "".join(B_parts) + "</g>"
(W / "b-symbol.svg").write_text(svg(256, 256, B_sym, "Tino B simbolo"))

# ---------- C: Bocadillo ----------
import math
bcx, bcy, br = 132, 120, 100
def pt(a): return (bcx + br*math.cos(math.radians(a)), bcy + br*math.sin(math.radians(a)))
s, e = pt(118), pt(152)
outer = f"M {s[0]:.1f} {s[1]:.1f} A {br} {br} 0 1 0 {e[0]:.1f} {e[1]:.1f} L 30 234 Z"
tx, tw = 118, 30  # palo de la t
t_hole = (f"M {tx} 58 H {tx+tw} V 92 H {tx+tw+34} V 120 H {tx+tw} V 160 "
          f"A 14 14 0 0 0 {tx+tw+14} 174 H {tx+tw+28} V 202 H {tx+tw+10} "
          f"A 40 40 0 0 1 {tx-0} 162 V 120 H {tx-30} V 92 H {tx} Z")
C_sym = f'<path fill-rule="evenodd" d="{outer} {t_hole}"/>'
(W / "c-symbol.svg").write_text(svg(256, 256, C_sym, "Tino C simbolo"))

# ---------- Lockups ----------
def lockup(name, sym_body, dot_circle=False, dot_color="#000"):
    s = 0.105
    # base del texto en y=180 del lockup; símbolo 256 escalado a 1.0
    wx = 290
    wm = wordmark(dot_circle)
    body = f'{sym_body}<g transform="translate({wx} 196) scale({s})"><path d="{wm}"/></g>'
    if dot_circle:
        gi = g["glyphs"][1]
        x0, y0, x1, y1 = gi["bounds"]
        dcx = (x0 + x1) / 2 + 40
        body += f'<circle cx="{wx + dcx*s:.1f}" cy="{196 - 1270*s:.1f}" r="{150*s:.1f}" fill="{dot_color}"/>'
    width = int(wx + g["advance"] * s + 24)
    (W / f"{name}-lockup.svg").write_text(svg(width, 256, body, f"Tino {name} lockup"))

lockup("a", A_sym, dot_circle=True)
lockup("b", B_sym)
lockup("c", C_sym)
print("ok")

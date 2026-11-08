"""Kit del logo de Tino (dirección A · El punto justo).
Genera SVG maestros en branding/logo/final/. Ejecutar: python build_kit.py
"""
import json, re, pathlib
ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "final"; OUT.mkdir(exist_ok=True)
g = json.load(open(ROOT / "work" / "tino-600.json"))

C = dict(crema="#F6EFE4", bosque="#1F3D2B", terracota="#D9653B", sol="#F2B33D", tinta="#2A211B", arena="#E8D5B5")

# ---------- geometría del símbolo (unidad: canvas 256) ----------
def symbol_parts(small=False):
    """Devuelve (path del arco, (cx, cy, r) del punto). Centrado ópticamente en 256."""
    cx, R, r = 128, 94, 61 if not small else 58
    cap = (R - r) / 2
    dot_r = 35 if not small else 33
    gap = 14 if not small else 22          # aire entre punto y arco (más grande en la versión pequeña)
    # punto dentro del cuenco: distancia del centro del punto al fondo interior = dot_r + gap
    # alto total: desde tope del remate (cy - cap) hasta fondo exterior (cy + R)
    # punto: cy + (r - dot_r - gap) es su centro
    dot_dy = r - dot_r - gap
    top = min(-cap, dot_dy - dot_r); bottom = R
    cy = 128 - (top + bottom) / 2 - 4      # -4 = centro óptico, ligeramente arriba
    arc = (f"M {cx-R} {cy:.2f} A {R} {R} 0 0 0 {cx+R} {cy:.2f} "
           f"A {cap} {cap} 0 0 0 {cx+r} {cy:.2f} "
           f"A {r} {r} 0 0 1 {cx-r} {cy:.2f} "
           f"A {cap} {cap} 0 0 0 {cx-R} {cy:.2f} Z")
    return arc, (cx, cy + dot_dy, dot_r)

def symbol_body(arc_color, dot_color, small=False, transform=""):
    arc, (dx, dy, dr) = symbol_parts(small)
    t = f' transform="{transform}"' if transform else ""
    return (f'<g{t}><path fill="{arc_color}" d="{arc}"/>'
            f'<circle fill="{dot_color}" cx="{dx}" cy="{dy:.2f}" r="{dr}"/></g>')

def svg(w, h, body, title, bg=None):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'<title>{title}</title>{rect}{body}</svg>\n')

# ---------- wordmark ----------
def split_subpaths(d): return [s.strip() + "Z" for s in d.split("Z") if s.strip()]
def ymax(s):
    ys = [float(v) for v in re.findall(r"-?\d+\.?\d*", s)[1::2]]; return min(ys)
glyphs_d = []; i_dot = None
for gl in g["glyphs"]:
    subs = split_subpaths(gl["d"])
    if gl["ch"] == "i":
        subs.sort(key=ymax); dot_sub = subs[0]; subs = subs[1:]
        ys = [float(v) for v in re.findall(r"-?\d+\.?\d*", dot_sub)[1::2]]
        xs = [float(v) for v in re.findall(r"-?\d+\.?\d*", dot_sub)[0::2]]
        i_dot = ((min(xs)+max(xs))/2, (min(ys)+max(ys))/2, (max(ys)-min(ys))/2)
    glyphs_d.extend(subs)
WM_D = " ".join(glyphs_d)
ADV = g["advance"]; ASC = 1416  # alto de la i con punto (unidades de fuente)

def wordmark_body(color, dot_color, x, base_y, s):
    dx, dy, dr = i_dot
    return (f'<g transform="translate({x:.2f} {base_y:.2f}) scale({s})"><path fill="{color}" d="{WM_D}"/>'
            f'<circle fill="{dot_color}" cx="{dx:.1f}" cy="{dy:.1f}" r="{dr*1.08:.1f}"/></g>')

# ---------- variantes ----------
schemes = {
    "color":      (C["bosque"], C["terracota"], None),
    "black":      ("#000000", "#000000", None),
    "white":      ("#FFFFFF", "#FFFFFF", None),
    "reversed":   (C["crema"], C["sol"], None),     # sobre bosque
}
for name, (a, d, _) in schemes.items():
    (OUT / f"tino-symbol-{name}.svg").write_text(svg(256, 256, symbol_body(a, d), f"Tino símbolo {name}"), encoding="utf-8")
(OUT / "tino-symbol-small-color.svg").write_text(svg(256, 256, symbol_body(C["bosque"], C["terracota"], small=True), "Tino símbolo (tamaños pequeños)"), encoding="utf-8")
(OUT / "tino-symbol-small-black.svg").write_text(svg(256, 256, symbol_body("#000", "#000", small=True), "Tino símbolo pequeño negro"), encoding="utf-8")

# lockup horizontal: alto 256; wordmark con x-height ~ alto del cuenco
s = 0.118
wm_w = ADV * s
sym_scale = 0.86
gap = 30
base_y = 128 + 970 * s / 2 + 4        # centra la x-height sobre el eje del símbolo
sym_w = 256 * sym_scale
for name, (a, d, _) in schemes.items():
    body = symbol_body(a, d, transform=f"translate(0 {128-128*sym_scale:.2f}) scale({sym_scale})")
    body += wordmark_body(a, d, sym_w + gap - 18, base_y, s)
    W = int(sym_w + gap - 18 + wm_w + 8)
    (OUT / f"tino-horizontal-{name}.svg").write_text(svg(W, 256, body, f"Tino horizontal {name}"), encoding="utf-8")
    # apilado: símbolo arriba, wordmark centrado debajo (ancho del wordmark ≈ 1.5× el arco)
    ws = 0.074; ww = ADV * ws
    W2 = 320
    body2 = symbol_body(a, d, transform=f"translate({(W2-256)/2:.2f} -20)")
    body2 += wordmark_body(a, d, (W2 - ww) / 2, 300, ws)
    (OUT / f"tino-stacked-{name}.svg").write_text(svg(W2, 330, body2, f"Tino apilado {name}"), encoding="utf-8")
    # solo wordmark
    ws3 = 0.12; W3 = int(ADV * ws3 + 16)
    (OUT / f"tino-wordmark-{name}.svg").write_text(svg(W3, 200, wordmark_body(a, d, 8, 172, ws3), f"Tino wordmark {name}"), encoding="utf-8")

# ---------- opciones de ícono de app (para elegir) ----------
icon_opts = {
    "icon-opt1-terracota": (C["terracota"], C["crema"], C["crema"]),
    "icon-opt2-terracota-sol": (C["terracota"], C["crema"], C["sol"]),
    "icon-opt3-bosque": (C["bosque"], C["crema"], C["sol"]),
    "icon-opt4-crema": (C["crema"], C["bosque"], C["terracota"]),
}
for name, (bg, a, d) in icon_opts.items():
    body = symbol_body(a, d, transform="translate(38.4 38.4) scale(0.7)")
    (ROOT / "work" / f"{name}.svg").write_text(svg(256, 256, f'<rect width="256" height="256" rx="56" fill="{bg}"/>' + body, name), encoding="utf-8")
print("ok", i_dot)

# ---------- assets de app (Android/iOS/web) ----------
APP = ROOT / "app"; APP.mkdir(exist_ok=True)
ICON_BG, ICON_ARC, ICON_DOT = C["bosque"], C["crema"], C["sol"]
def sym_at(canvas, sym_width_px, a, d, small=False):
    """Símbolo centrado en un canvas cuadrado, con el ancho visible del arco = sym_width_px."""
    k = sym_width_px / 188.0           # 188 = ancho del arco en el canvas de 256
    off = canvas / 2 - 128 * k
    return symbol_body(a, d, small, transform=f"translate({off:.2f} {off:.2f}) scale({k:.4f})")
# Adaptive icon: 1024 = 108 dp; zona segura 66 dp ≈ 626 px de diámetro → símbolo de 540 px de ancho
(APP / "android-icon-foreground.svg").write_text(svg(1024, 1024, sym_at(1024, 540, ICON_ARC, ICON_DOT), "Tino adaptive foreground"), encoding="utf-8")
(APP / "android-icon-background.svg").write_text(svg(1024, 1024, "", "Tino adaptive background", bg=ICON_BG), encoding="utf-8")
(APP / "android-icon-monochrome.svg").write_text(svg(1024, 1024, sym_at(1024, 540, "#FFFFFF", "#FFFFFF"), "Tino adaptive monochrome"), encoding="utf-8")
# Ícono iOS / legado / tienda: cuadrado lleno (el sistema redondea)
(APP / "icon.svg").write_text(svg(1024, 1024, sym_at(1024, 620, ICON_ARC, ICON_DOT), "Tino icon", bg=ICON_BG), encoding="utf-8")
# Splash: símbolo a color sobre crema (el fondo lo pone expo-splash-screen)
(APP / "splash-icon.svg").write_text(svg(1024, 1024, sym_at(1024, 900, C["bosque"], C["terracota"]), "Tino splash"), encoding="utf-8")
# Favicon: versión para tamaños pequeños sobre terracota redondeado
(APP / "favicon.svg").write_text(svg(256, 256, f'<rect width="256" height="256" rx="60" fill="{ICON_BG}"/>' + sym_at(256, 196, ICON_ARC, ICON_DOT, small=True), "Tino favicon"), encoding="utf-8")
# Ícono de Play Store 512 (mismo arte que icon)
print("app ok")

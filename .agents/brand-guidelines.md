# Tino — Guía de marca v1 (2026-11-08)

> Fuente de verdad en texto de la guía. La versión visual es la presentación de Canva. Arte en `branding/logo/` (regenerable con `build_kit.py`). Base: `.agents/brand-context.md`, `target-audience.md`, `competitor-branding.md`, `brand-positioning.md`, `brand-naming.md`.

## Parte 1 — Fundamentos

**Sobre esta guía.** Sirve a quien diseñe, escriba o programe algo con la marca Tino (hoy Santiago; mañana freelancers, creadores o una agencia). Si algo no está aquí, decide pensando en la frase de posicionamiento.

**Misión.** Que cualquier persona en Latam entienda su plata en minutos y tome mejores decisiones cada mes, sin necesidad de ser experta en finanzas.
**Visión.** Ser el amigo con buen criterio para la plata de millones de latinoamericanos: independiente, privado y hecho aquí.

**Valores**
1. **Claridad sobre complejidad.** Si no se entiende en 5 segundos, se simplifica.
2. **Privacidad primero.** Tus datos son tuyos: no los vendemos ni pedimos claves del banco.
3. **Sin juicio.** Acompañamos; nunca regañamos ni avergonzamos.
4. **Progreso pequeño y constante.** Celebramos mejorar un poco cada mes.
5. **Hecho para aquí.** Pesos, quincena y extractos colombianos de verdad.

**Personalidad:** cercana, clara, tranquila, honesta, optimista.

**El nombre.** *Tino* (RAE): "habilidad para acertar", "juicio y cordura". Y también un nombre de persona. Es las dos caras de la marca: **inteligente por dentro, humana por fuera.**

**Posicionamiento.** Para colombianos que sienten que la plata se les va sin saber en qué, Tino es la app de finanzas personales que entiende tu plata por ti y te la explica sin juicio, porque lee los extractos de tu banco, aprende de tus hábitos con una IA propia y nunca te vende productos financieros.

**En una frase:** La app que entiende tu plata y te la explica como un amigo.

## Parte 2 — Identidad visual

### Logo
- **Símbolo "El punto justo":** un punto sostenido por un arco. El punto es el acierto (tener tino); el arco, el abrazo. El punto del símbolo es el mismo punto de la "i" del wordmark.
- **Wordmark:** "tino" en minúsculas, Fraunces SemiBold convertida a trazos; el punto de la i siempre va en color de acento.
- **Versiones:** horizontal (principal), apilada, solo símbolo (ícono, avatar, favicon), solo wordmark (cuando el símbolo ya aparece cerca).
- **Color:** sobre fondos claros, arco y letras en bosque + punto terracota. Sobre fondos oscuros (bosque), crema + punto sol. A una tinta: todo negro o todo blanco.
- **Área de respeto:** alrededor de todo el logo, mínimo el diámetro del punto del símbolo (≈ 27 % del ancho del arco).
- **Tamaño mínimo:** símbolo 16 px (por debajo de 24 px, usar `tino-symbol-small`, con más aire); horizontal 80 px de ancho; apilado 48 px de ancho. En impresión: horizontal 20 mm.
- **Usos incorrectos:** no estirar ni deformar; no rotar; no cambiar el color del punto por uno fuera de la paleta ni dejarlo del mismo color que el arco en la versión a color; no separar ni mover el punto respecto al arco; no añadir sombras, contornos, degradados ni efectos 3D; no poner el logo sobre fotos o fondos recargados sin contenedor; no reescribir "tino" con otra fuente ni en mayúsculas ("TINO" solo en texto legal).

### Ícono de app
Fondo **bosque**, arco **crema**, punto **sol**. Adaptive icon de Android: foreground transparente (símbolo de 540/1024 px dentro de la zona segura de 66 dp), background bosque, monochrome blanco. Splash: símbolo a color sobre crema.

### Color
| Rol | Nombre | HEX | RGB | CMYK |
|---|---|---|---|---|
| Primario | Bosque | #1F3D2B | 31 61 43 | 49 0 30 76 |
| Primario (acento) | Terracota | #D9653B | 217 101 59 | 0 53 73 15 |
| Secundario | Sol | #F2B33D | 242 179 61 | 0 26 75 5 |
| Fondo | Crema | #F6EFE4 | 246 239 228 | 0 3 7 4 |
| Fondo secundario | Arena | #E8D5B5 | 232 213 181 | 0 8 22 9 |
| Texto | Tinta | #2A211B | 42 33 27 | 0 21 36 84 |
| Texto secundario | Muted | #8A7B6B | 138 123 107 | 0 11 22 46 |

Pantone: pendiente de cotejar con una guía física antes de imprimir (las conversiones automáticas no son fiables).

**El color como dato (en la app):** bosque = a favor, ingresos, IA; terracota = alerta o exceso; sol = progreso o metas.

**Proporción de uso:** crema 60 % · bosque 25 % · terracota 10 % · sol 5 %.

**Accesibilidad (WCAG):**
- Tinta sobre crema: 13.8:1. Bosque sobre crema: 10.4:1. Sol sobre bosque: 6.4:1. Tinta sobre sol: 8.5:1. Todas AA/AAA.
- Terracota sobre crema: 3.1:1. Solo para texto grande (≥ 24 px, o 19 px en negrita), íconos y el punto; nunca para texto corrido.
- **Prohibido:** sol sobre crema (1.6:1) para texto; terracota sobre bosque; verde "billete" o azul banco como color dominante.

### Tipografía
- **Fraunces** (serif, OFL): titulares, cifras grandes y la voz de Tino en *itálica*. Pesos: 600 SemiBold (marca y titulares), 400 Regular *Italic* (voz de la IA).
- **DM Sans** (sans, OFL): interfaz, cuerpo, botones, etiquetas. Pesos: 400, 500, 600.

| Nivel | Fuente | Peso | Tamaño | Uso |
|---|---|---|---|---|
| Display / monto | Fraunces | 600 | 40–56 px | saldo, cifra protagonista |
| H1 | Fraunces | 600 | 28–32 px | título de pantalla |
| H2 | Fraunces | 600 | 22–24 px | sección |
| H3 | DM Sans | 600 | 17–18 px | título de tarjeta |
| Voz de Tino | Fraunces Italic | 400 | 17–20 px | "Tino te sugiere…" |
| Cuerpo | DM Sans | 400 | 15–16 px | texto general |
| Label | DM Sans | 500 | 13–14 px | botones, chips |
| Caption | DM Sans | 400 | 12 px | fechas, ayudas |

Interlineado: 1.2 en titulares, 1.5 en cuerpo. Tracking: −1 % en Fraunces grande, 0 en DM Sans. Respaldo: `Georgia, serif` / `system-ui, sans-serif`.

### Imágenes e iconografía
- **Fotografía:** personas reales colombianas en momentos cotidianos (mercado, transporte, casa, café), luz cálida natural y tonos de piel fieles. Nada de ejecutivos de corbata ni billetes en abanico.
- **Ilustración:** formas orgánicas planas con la paleta (blobs de sol, arena y terracota), sin degradados ni personajes de stock.
- **Íconos:** lucide, trazo 1.75–2 px, esquinas redondeadas, en tinta o bosque.
- **Evitar:** alcancías, cohetes, gráficas que suben, monedas doradas, escudos, candados gigantes, el oscuro con neón "fintech".

## Parte 3 — Identidad verbal

**Esencia de la voz.** Tino habla como ese amigo que sabe de plata: claro, tranquilo y de tu lado.

**Dimensiones de tono**
- **Cercano, no confianzudo:** tutea, usa "plata" y "quincena"; nada de "parcero, ¡pilas con esa vaca!".
- **Claro, no simplón:** términos exactos explicados en una línea.
- **Tranquilo, no indiferente:** las alertas informan y proponen; no alarman.
- **Optimista, no vendedor:** celebra el progreso real; no promete hacerte rico.

| Cualidad | Sí | No |
|---|---|---|
| Sin juicio | "Este mes los domicilios van 30 % arriba. ¿Le ponemos un tope?" | "¡Otra vez gastaste demasiado en comida!" |
| Concreto | "Si bajas 2 domicilios a la semana, te quedan $96.000 al mes." | "Optimiza tus gastos para maximizar tu ahorro." |
| Honesto | "Todavía no tenemos datos suficientes para predecir tu mes." | "¡Nuestra IA lo sabe todo sobre tus finanzas!" |
| Local | "Tu quincena llegó: $1.850.000. Ya separamos lo del arriendo." | "Your paycheck has been deposited." (o traducciones literales) |
| Breve | "Listo. Importamos 48 movimientos." | "La operación de importación se ha completado satisfactoriamente." |

**Estilo de escritura**
- Frases de máximo 20 palabras; un mensaje por pantalla.
- Mayúscula solo al inicio de frase (también en títulos y botones: "Importar extracto").
- Montos con formato colombiano: `$1.234.567` (punto de miles, sin decimales salvo que importen).
- Números siempre en cifras en la interfaz; en textos largos, de uno a nueve en letras.
- Signos de apertura ¿¡ siempre. Emojis: máximo uno y solo en celebraciones.
- La IA habla en primera persona del plural ("notamos", "te sugerimos") o como Tino ("Tino te sugiere…"), nunca como "el sistema".

**Decimos:** plata, quincena, tu mes, gastos hormiga, te sugerimos, ¿le ponemos un tope?, vas bien, colchón, extracto, tranquilo/a, entiende, a tu ritmo.
**No decimos:** libertad financiera, hazte rico, finanzas inteligentes, optimiza, maximiza, smart, cash, ¡alerta!, has fallado, deudor, sistema, usuario (en la UI).

## Parte 4 — Mensajes

- **Mensaje central:** Tino entiende tu plata y te la explica como un amigo.
- **Propuesta de valor:** Sube el extracto de tu banco y en un minuto sabes en qué se te va la plata. Tino lo organiza, te explica tu mes en simple y te sugiere qué ajustar, sin regaños y sin venderte nada.
- **Tagline:** **"Tu plata, con tino."** Alternativa: "Entiende tu plata." Usar en tienda, splash de marketing, redes y web; no dentro de cada pantalla de la app.
- **Mensajes clave:**
  1. *Sin anotar todo a mano:* lee extractos reales de Bancolombia (ahorros y TC) y otros en Excel/CSV.
  2. *Sin claves del banco:* tú subes el archivo y decides qué compartes.
  3. *Sin venderte nada:* vivimos de la suscripción, no de créditos ni de tus datos.
  4. *Cada vez te entiende mejor (Fase 2):* IA propia que aprende de tus hábitos y predice tu mes; tus datos no salen a terceros. **No comunicar como disponible hasta la Fase 2.**

## Parte 5 — La marca en uso

- **App:** encabezado con saludo, saldo protagonista en Fraunces, tarjeta "Tino te sugiere" en crema/arena con itálica, botón primario bosque con texto crema, FAB central.
- **Play Store:** nombre "Tino: control de gastos"; ícono bosque; capturas sobre crema con titulares en Fraunces ("Sube tu extracto. Tino hace el resto."); ícono de 512 px en `branding/logo/app/png/store/icon.png`.
- **Redes:** avatar = símbolo sobre bosque; publicaciones sobre crema o bosque, titulares en Fraunces y un dato concreto por pieza ("¿En qué se te fue la quincena?"); captions cortos en voz de Tino.
- **Web:** favicon = símbolo pequeño sobre bosque redondeado; mismo origen que la API.
- **Presentaciones:** fondo crema, títulos en Fraunces 600, cuerpo en DM Sans; una idea por diapositiva; acento terracota solo para lo que importa.

### Lo que nunca se hace
- [ ] Usar el símbolo por debajo de 16 px, o el horizontal por debajo de 80 px.
- [ ] Separar el punto del arco o cambiar su color fuera de la paleta.
- [ ] Usar colores fuera de la paleta o verde "billete" / azul banco como dominante.
- [ ] Texto en terracota o sol sobre crema por debajo de 24 px.
- [ ] Usar otras fuentes distintas a Fraunces y DM Sans.
- [ ] Regañar, culpar o alarmar al usuario.
- [ ] Prometer riqueza, "libertad financiera" o funciones de IA que aún no existen.
- [ ] Usar alcancías, cohetes, gráficas que suben o billetes como imagen.

## Parte 6 — Contactos y archivos
- **Guardián de marca:** Santiago García (dueño del producto).
- **Archivos:** `branding/logo/final/` (SVG maestros), `branding/logo/app/` (íconos, splash, favicon), presentación en Canva, tokens en `web/src/styles/tokens.css` y `mobile/src/theme/tokens.ts`.
- **Pendientes:** Pantone verificado; dominio (`tinofinanzas.com`) y usuarios en redes; marca registrada ante la SIC (clases 9, 36 y 42).

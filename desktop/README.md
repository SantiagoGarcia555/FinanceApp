# Finance APP — Desktop (Tauri)

Empaqueta el mismo frontend de `web` (React + Vite + Tailwind) como app de
escritorio nativa (Windows/macOS/Linux), sin duplicar código de UI.

## Por qué Tauri (en vez de Electron)

- Reutiliza el build de `web` tal cual (Vite output).
- Binarios mucho más livianos que Electron (usa el WebView del sistema, no
  empaqueta Chromium completo).
- Backend nativo en Rust opcional, solo si luego necesitas acceso a
  filesystem/DB local — no es obligatorio para el MVP.

## Cómo inicializar (ejecutar en tu máquina local)

```bash
cd finance-app
npm create tauri-app@latest desktop -- --template react-ts
# Cuando pregunte, apunta el frontend a ../web (o copia la config para
# apuntar a la carpeta web existente en vez de crear una nueva)
```

Alternativa más simple si quieres evitar instalar el toolchain de Rust por
ahora: empezar solo con `web` + PWA (installable) y posponer Tauri hasta que
haya usuarios pidiendo versión de escritorio nativa.

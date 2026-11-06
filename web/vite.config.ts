import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // ../shared (código común con la app móvil) está fuera de web/: el dev server debe poder servirlo
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../shared'] },
    proxy: {
      // Redirige las llamadas a la API hacia el backend ASP.NET Core en desarrollo.
      // Se usa HTTPS (64347) porque la API hace UseHttpsRedirection: apuntar al puerto HTTP (64348)
      // devuelve un 307 que el navegador seguiría fuera del proxy (CORS).
      // `secure: false` acepta el certificado de desarrollo de .NET.
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'https://localhost:64347',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

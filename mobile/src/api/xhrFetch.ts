/**
 * `fetch` mínimo sobre XMLHttpRequest, solo para SUBIR ARCHIVOS desde el teléfono.
 *
 * Por qué: desde SDK 58 el `fetch` global es `expo/fetch`, que no acepta la parte `{ uri, name, type }`
 * de un FormData, y leer el archivo desde JS (expo-file-system) depende de permisos que cambian
 * entre Expo Go y el build propio. XMLHttpRequest sigue siendo el de React Native: su módulo de red
 * nativo lee la URI por su cuenta (file:// del selector o content:// de "Compartir con Tino").
 *
 * Sin imports de React Native: usa los globales (XMLHttpRequest, Headers, Response) y se prueba con
 * un XHR falso en tests/xhrFetch.test.mts.
 */
export function xhrFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(init.method ?? 'GET', String(input))
    // No se fija Content-Type con FormData: XHR pone multipart/form-data con su boundary.
    for (const [key, value] of Object.entries((init.headers ?? {}) as Record<string, string>)) {
      xhr.setRequestHeader(key, value)
    }

    const onAbort = () => xhr.abort()
    init.signal?.addEventListener('abort', onAbort)
    const done = () => init.signal?.removeEventListener('abort', onAbort)

    xhr.onload = () => {
      done()
      const headers = new Headers()
      for (const line of xhr.getAllResponseHeaders().split(/\r?\n/)) {
        const i = line.indexOf(':')
        if (i > 0) headers.append(line.slice(0, i).trim(), line.slice(i + 1).trim())
      }
      const empty = xhr.status === 204 || xhr.status === 205 || xhr.status === 304
      resolve(new Response(empty ? null : xhr.responseText, { status: xhr.status, headers }))
    }
    // Mismo error que el fetch de React Native: client.ts lo reconoce como "sin red".
    xhr.onerror = () => {
      done()
      reject(new TypeError('Network request failed'))
    }
    xhr.ontimeout = xhr.onerror
    xhr.onabort = () => {
      done()
      const error = new Error('Aborted')
      error.name = 'AbortError'
      reject(error)
    }

    xhr.send((init.body ?? null) as XMLHttpRequestBodyInit | null)
  })
}

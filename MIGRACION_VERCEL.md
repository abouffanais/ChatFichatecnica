# Migración a Vercel — Kitchen Center Chatbot

## ¿Qué es una "invocación"?

Cada vez que alguien usa el chatbot, ocurre lo siguiente:

| Acción del usuario | Invocaciones que genera |
|---|---|
| Abrir el chatbot (carga la lista de productos) | 1 invocación → `list-products` |
| Enviar 1 mensaje al bot | 1 invocación → `chat` |
| Preguntar por stock de un SKU | 1 invocación → `stock-query` |
| Una sesión completa (10 mensajes) | ~11 invocaciones |

**Netlify Free:** 125.000 invocaciones/mes totales
**Vercel Free:** 100.000 invocaciones/mes — pero se reinicia cada mes sin pausar el sitio

Con uso normal del chatbot (50 sesiones/día × 10 mensajes = 500 invocaciones/día × 30 días = **15.000/mes**), estás muy por debajo del límite.

---

## Archivos listos para subir a GitHub

```
ChatbotCyber/
├── index.html          ← URLs actualizadas a /api/
├── vercel.json         ← Configuración de Vercel (NUEVO)
└── api/
    ├── chat.js         ← NUEVO (equivale a netlify/functions/chat.js)
    ├── list-products.js ← NUEVO (equivale a netlify/functions/list-products.js)
    └── stock-query.js  ← NUEVO (equivale a netlify/functions/stock-query.js)
```

Los archivos de `netlify/functions/` se **mantienen** en el repo porque:
- Ahí están los PDFs (`netlify/functions/pdfs/`)
- Ahí está el `stock.json` (`netlify/functions/stock.json`)
- Las nuevas funciones en `/api/` los leen desde esa ruta

---

## Paso a paso para migrar

### 1 — Subir los archivos nuevos a GitHub

En tu repo `ChatFichatecnica`:

**Crear carpeta `api/` y subir las 3 funciones:**
- `api/chat.js`
- `api/list-products.js`
- `api/stock-query.js`

**Reemplazar archivos existentes:**
- `index.html` (URLs cambiadas a /api/)
- Subir `vercel.json` en la raíz del repo

### 2 — Crear cuenta en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Clic en **Sign Up → Continue with GitHub**
3. Autoriza el acceso a tus repositorios

### 3 — Importar el proyecto

1. En Vercel, clic en **Add New → Project**
2. Busca y selecciona tu repo `ChatFichatecnica`
3. Clic en **Import**

### 4 — Configurar variables de entorno

Antes de hacer deploy, Vercel te pedirá las variables de entorno.
Agrega las mismas que tenías en Netlify:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | Tu API key de Anthropic |
| `NETLIFY_SITE_URL` | (ya no es necesaria, puedes omitirla) |

Para agregarlas: en el panel del proyecto → **Settings → Environment Variables**

### 5 — Deploy

Clic en **Deploy**. Vercel construye y publica el sitio automáticamente.
Tu nueva URL será algo como: `chatfichatecnica.vercel.app`

### 6 — Actualizar Netlify Identity

Netlify Identity (el sistema de login) seguirá funcionando, pero necesita saber
la nueva URL del sitio. Ve a tu panel de **Netlify → tu sitio → Identity → Settings**
y actualiza la URL de redirección con tu nueva URL de Vercel.

---

## Límites del plan gratuito de Vercel

| Recurso | Límite Free |
|---|---|
| Invocaciones de funciones | 100.000 / mes |
| Duración máxima por función | 10 segundos (hobby) |
| Bandwidth | 100 GB / mes |
| Deployments | Ilimitados |
| Dominios custom | Ilimitados |

> ⚠️ **Importante:** Las funciones en el plan Free tienen un límite de **10 segundos** de ejecución.
> Si Claude tarda más en responder (PDFs grandes), puede ocurrir timeout.
> Para aumentarlo a 30s, se necesita el plan Pro (~$20/mes). En la práctica,
> respuestas simples tardan 3-5s y deberían estar bien en el plan Free.

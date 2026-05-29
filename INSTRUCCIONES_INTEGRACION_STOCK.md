# Integración de Stock al Chatbot — Kitchen Center

## Archivos generados

| Archivo | Descripción |
|---|---|
| `actualizar_stock.py` | Corre en tu PC para convertir el Excel a JSON |
| `netlify/functions/stock-query.js` | Función Netlify que responde consultas de stock |
| `INSTRUCCIONES_INTEGRACION_STOCK.md` | Este archivo |

---

## Paso 1 — Crear la carpeta de datos en GitHub

En tu repo `ChatFichatecnica`, crea la carpeta:
```
netlify/functions/data/
```
Para que GitHub acepte una carpeta vacía, sube un archivo placeholder:
- Nombre: `.gitkeep`
- Contenido: (vacío)

---

## Paso 2 — Subir stock-query.js a GitHub

Sube el archivo `netlify/functions/stock-query.js` a la misma carpeta del repo donde está `chat.js`:
```
netlify/functions/stock-query.js
```

---

## Paso 3 — Agregar la integración en index.html

Abre tu `index.html` en GitHub y busca la función `sendMessage` (o la función que se llama cuando el usuario presiona Enter/Enviar).

Justo **antes** de donde se hace el `fetch` a la función `chat`, agrega este bloque:

```javascript
// ─── DETECCIÓN DE CONSULTA DE STOCK ───────────────────────────────────────
async function consultarStock(texto) {
  // Palabras clave que activan la consulta de stock
  const keywords = ["stock", "inventario", "disponible", "bodega", "unidades", "hay en", "cuántos", "cuantos", "existencia", "sku"];
  const textoLower = texto.toLowerCase();
  const esConsultaStock = keywords.some(k => textoLower.includes(k));
  if (!esConsultaStock) return null;

  // Extraer posible SKU (número de 4-6 dígitos) o usar el texto completo
  const skuMatch = texto.match(/\b(\d{4,6})\b/);
  const query    = skuMatch ? skuMatch[1] : texto;

  try {
    const res  = await fetch("/.netlify/functions/stock-query", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ query })
    });
    const data = await res.json();
    if (data.respuesta) {
      return `${data.respuesta}\n\n_Datos actualizados al: ${data.actualizado_el}_`;
    }
  } catch (e) {
    console.error("Error consultando stock:", e);
  }
  return null;
}
// ──────────────────────────────────────────────────────────────────────────────
```

Luego, en tu función `sendMessage`, **antes** de hacer el fetch al chat, agrega:

```javascript
// Intentar responder desde stock primero
const respuestaStock = await consultarStock(userMessage);
if (respuestaStock) {
  appendMessage("bot", respuestaStock);
  return;  // No llama a Claude, ya respondió con el stock
}
// ... aquí continúa el fetch al chat normal
```

---

## Paso 4 — Generar el stock.json por primera vez

En tu PC (conectado a WiFi de KC o VPN + FortiToken):

1. Refresca la conexión ODBC en Excel
2. Guarda el archivo como `Stock_disponible.xlsx`
3. Coloca `actualizar_stock.py` en la misma carpeta que el Excel
4. Ejecuta en PowerShell o CMD:
   ```
   python actualizar_stock.py
   ```
5. Se genera: `netlify/functions/data/stock.json`
6. Sube ese archivo a GitHub en: `netlify/functions/data/stock.json`

---

## Paso 5 — Actualización rutinaria del stock

Cada vez que quieras actualizar el stock en el chatbot:

1. Conectar VPN (FortiToken) si estás fuera de la oficina
2. Abrir Excel → refrescar conexión ODBC (Datos → Actualizar todo)
3. Guardar el Excel
4. Ejecutar: `python actualizar_stock.py`
5. Subir el `stock.json` generado a GitHub

El script tarda ~30 segundos para las 20.000+ filas. 

---

## Ejemplos de preguntas que responderá el chatbot

| Pregunta del usuario | Qué hace el chatbot |
|---|---|
| "¿Cuánto stock hay del SKU 24236?" | Muestra tabla por bodega |
| "Inventario de cocinas Smeg" | Lista todos los Smeg con su disponible |
| "¿Hay disponibilidad de la campana FDV 60cm?" | Busca por nombre y muestra bodegas |
| "stock disponible kitchenaid" | Lista todos los KitchenAid con stock |

---

## Estructura del repo después de la integración

```
ChatFichatecnica/
├── index.html                          ← Modificar (agregar snippet)
├── netlify.toml
└── netlify/
    └── functions/
        ├── chat.js                     ← Sin cambios
        ├── list-products.js            ← Sin cambios
        ├── stock-query.js              ← NUEVO
        ├── package.json
        ├── pdfs/
        │   └── *.pdf
        └── data/
            └── stock.json              ← NUEVO (se regenera con el script)
```

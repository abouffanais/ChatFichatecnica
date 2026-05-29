// netlify/functions/stock-query.js
// Función serverless que consulta stock por SKU o nombre de producto
// Lee el archivo stock.json generado por actualizar_stock.py

const fs   = require("fs");
const path = require("path");

const STOCK_FILE = path.join(__dirname, "stock.json");

// Carga el JSON de stock (se cachea en memoria durante la instancia Lambda)
let stockCache = null;
function cargarStock() {
  if (!stockCache) {
    if (!fs.existsSync(STOCK_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(STOCK_FILE, "utf-8");
    stockCache = JSON.parse(raw);
  }
  return stockCache;
}

// Formatea el resultado como tabla Markdown para el chatbot
function formatearResultado(productos) {
  if (productos.length === 0) {
    return "No se encontraron productos con ese SKU o nombre.";
  }

  let respuesta = "";

  for (const prod of productos) {
    const estado   = prod.obsoleto ? " ⚠️ *Obsoleto*" : "";
    const stockTotal = prod.total_stock_disponible;
    const emoji    = stockTotal > 0 ? "🟢" : "🔴";

    respuesta += `### ${emoji} ${prod.nombre}${estado}\n`;
    respuesta += `**SKU:** ${prod.sku} | **Marca:** ${prod.marca} | **Categoría:** ${prod.categoria}\n\n`;
    respuesta += `**Stock disponible total: ${stockTotal} unidades**\n\n`;

    if (prod.bodegas && prod.bodegas.length > 0) {
      // Filtrar bodegas con actividad
      const bodegasConStock = prod.bodegas.filter(
        b => b.disponible !== 0 || b.en_stock !== 0
      );

      if (bodegasConStock.length > 0) {
        respuesta += "| Bodega | En Stock | Comprometido | Disponible |\n";
        respuesta += "|--------|----------|--------------|------------|\n";
        for (const b of bodegasConStock) {
          const dispEmoji = b.disponible > 0 ? "✅" : "❌";
          respuesta += `| ${b.nombre} | ${b.en_stock} | ${b.comprometido} | ${dispEmoji} ${b.disponible} |\n`;
        }
      }
    } else {
      respuesta += "_Sin movimiento registrado en bodegas._\n";
    }

    respuesta += "\n---\n\n";
  }

  return respuesta.trim();
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin" : "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type"                : "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body  = JSON.parse(event.body || "{}");
    const query = (body.query || "").trim();

    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Se requiere un parámetro 'query' (SKU o nombre)" })
      };
    }

    const data = cargarStock();
    if (!data) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: "Archivo de stock no disponible. Sube netlify/functions/data/stock.json al repositorio."
        })
      };
    }

    const productos  = data.productos;
    const queryLower = query.toLowerCase();
    const resultados = [];

    // Buscar por SKU exacto primero
    if (productos[query]) {
      resultados.push(productos[query]);
    } else {
      // Buscar por nombre parcial (máx. 5 resultados)
      for (const [sku, prod] of Object.entries(productos)) {
        if (
          prod.nombre.toLowerCase().includes(queryLower) ||
          prod.marca.toLowerCase().includes(queryLower)  ||
          sku.includes(query)
        ) {
          resultados.push(prod);
          if (resultados.length >= 5) break;
        }
      }
    }

    const respuesta = formatearResultado(resultados);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        respuesta,
        total_encontrados : resultados.length,
        actualizado_el    : data.metadata?.actualizado_el || "Desconocido"
      })
    };

  } catch (err) {
    console.error("Error en stock-query:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error interno del servidor" })
    };
  }
};

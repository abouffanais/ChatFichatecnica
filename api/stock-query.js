// api/stock-query.js — Vercel serverless function
// Equivalente a netlify/functions/stock-query.js

const fs   = require("fs");
const path = require("path");

const STOCK_FILE = path.join(process.cwd(), "netlify", "functions", "stock.json");

let stockCache = null;
function cargarStock() {
  if (!stockCache) {
    if (!fs.existsSync(STOCK_FILE)) return null;
    stockCache = JSON.parse(fs.readFileSync(STOCK_FILE, "utf-8"));
  }
  return stockCache;
}

function formatearResultado(productos) {
  if (productos.length === 0) return "No se encontraron productos con ese SKU o nombre.";

  let respuesta = "";
  for (const prod of productos) {
    const estado     = prod.obsoleto ? " ⚠️ *Obsoleto*" : "";
    const stockTotal = prod.total_stock_disponible;
    const emoji      = stockTotal > 0 ? "🟢" : "🔴";

    respuesta += `### ${emoji} ${prod.nombre}${estado}\n`;
    respuesta += `**SKU:** ${prod.sku} | **Marca:** ${prod.marca} | **Categoría:** ${prod.categoria}\n\n`;
    respuesta += `**Stock disponible total: ${stockTotal} unidades**\n\n`;

    const bodegasConStock = (prod.bodegas || []).filter(b => b.disponible !== 0 || b.en_stock !== 0);
    if (bodegasConStock.length > 0) {
      respuesta += "| Bodega | En Stock | Comprometido | Disponible |\n";
      respuesta += "|--------|----------|--------------|------------|\n";
      for (const b of bodegasConStock) {
        const dispEmoji = b.disponible > 0 ? "✅" : "❌";
        respuesta += `| ${b.nombre} | ${b.en_stock} | ${b.comprometido} | ${dispEmoji} ${b.disponible} |\n`;
      }
    }
    respuesta += "\n---\n\n";
  }
  return respuesta.trim();
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { query = "" } = req.body || {};
    if (!query.trim()) return res.status(400).json({ error: "Se requiere 'query'" });

    const data = cargarStock();
    if (!data) return res.status(503).json({ error: "Archivo de stock no disponible." });

    const productos   = data.productos;
    const queryLower  = query.toLowerCase();
    const resultados  = [];

    if (productos[query]) {
      resultados.push(productos[query]);
    } else {
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

    return res.status(200).json({
      respuesta        : formatearResultado(resultados),
      total_encontrados: resultados.length,
      actualizado_el   : data.metadata?.actualizado_el || "Desconocido"
    });

  } catch (err) {
    console.error("Error stock-query:", err);
    return res.status(500).json({ error: "Error interno" });
  }
};

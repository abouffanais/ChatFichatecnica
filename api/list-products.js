// api/list-products.js — Vercel serverless function
// Lista los productos leyendo los archivos .txt en netlify/functions/texts/

const fs   = require("fs");
const path = require("path");

const TEXTS_DIR = path.join(process.cwd(), "netlify", "functions", "texts");

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Verificacion de acceso
  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.includes("kc-internal") && !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    if (!fs.existsSync(TEXTS_DIR)) {
      return res.status(200).json({ products: [] });
    }

    const files = fs.readdirSync(TEXTS_DIR).filter(f => f.toLowerCase().endsWith(".txt"));

    const products = files.map(filename => {
      // Formato: "16540 FT Refrigerador Smeg SBS IT.txt"
      const nameWithoutExt = filename.replace(/\.txt$/i, "");
      const skuMatch       = nameWithoutExt.match(/^(\d+)/);
      const sku            = skuMatch ? skuMatch[1] : null;
      const name           = sku
        ? nameWithoutExt.replace(/^\d+\s*/, "").trim()
        : nameWithoutExt;

      return {
        id      : filename,
        sku     : sku || "",
        name    : name || filename,
        filename: filename,
        path    : filename   // chat.js recibe esto y busca el .txt
      };
    });

    // Ordenar por SKU numericamente
    products.sort((a, b) => {
      const numA = parseInt(a.sku) || 0;
      const numB = parseInt(b.sku) || 0;
      return numA - numB;
    });

    return res.status(200).json({ products });

  } catch (err) {
    console.error("Error listando productos:", err);
    return res.status(500).json({ error: "Error al listar productos" });
  }
};

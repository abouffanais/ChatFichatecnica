// api/list-products.js — Vercel serverless function
// Equivalente a netlify/functions/list-products.js
// Lista los PDFs disponibles en la carpeta netlify/functions/pdfs/

const fs   = require("fs");
const path = require("path");

const PDFS_DIR = path.join(process.cwd(), "netlify", "functions", "pdfs");

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Verificación de acceso básica (token interno de Kitchen Center)
  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.includes("kc-internal") && !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    if (!fs.existsSync(PDFS_DIR)) {
      return res.status(200).json({ products: [] });
    }

    const files = fs.readdirSync(PDFS_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));

    const products = files.map(filename => {
      // Formato esperado: "13253 FT HORNO SMEG CLASSICA 90.pdf"
      // Extraer SKU (número al inicio) y nombre
      const nameWithoutExt = filename.replace(/\.pdf$/i, "");
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
        path    : filename
      };
    });

    // Ordenar por SKU numéricamente
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

// api/chat.js — Vercel serverless function
// Usa pdf-parse para extraer texto de los PDFs (más rápido que base64, evita timeout)

const Anthropic = require("@anthropic-ai/sdk");
const fs        = require("fs");
const path      = require("path");
const pdfParse  = require("pdf-parse");

const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PDFS_DIR = path.join(process.cwd(), "netlify", "functions", "pdfs");

// Extrae texto plano de un PDF
async function extraerTextoPDF(filename) {
  try {
    const filePath = path.join(PDFS_DIR, path.basename(filename));
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const data   = await pdfParse(buffer);
    return data.text?.trim() || null;
  } catch (e) {
    console.error("Error leyendo PDF:", filename, e.message);
    return null;
  }
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Método no permitido" });

  // Verificación de acceso básica
  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.includes("kc-internal") && !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const { messages = [], products = [] } = req.body;

    if (!messages.length) {
      return res.status(400).json({ error: "Se requieren mensajes" });
    }

    // Extraer texto de los PDFs seleccionados
    const contextosPDF = [];
    for (const product of products) {
      if (product.path || product.filename) {
        const filename = product.path || product.filename;
        const texto = await extraerTextoPDF(filename);
        if (texto) {
          contextosPDF.push(
            `=== FICHA TÉCNICA: ${product.name || filename} (SKU: ${product.sku || 'N/A'}) ===\n${texto}`
          );
        }
      }
    }

    // System prompt con contexto de fichas técnicas
    let systemPrompt = `Eres un asistente experto de Kitchen Center.
Ayudas a equipos de ventas y técnicos a consultar fichas técnicas de productos.
Responde siempre en español, de forma clara y profesional.
Si te preguntan por especificaciones, medidas, características o comparaciones,
usa únicamente la información de las fichas técnicas proporcionadas.
Cuando hagas comparaciones, usa tablas en formato Markdown.`;

    if (contextosPDF.length > 0) {
      systemPrompt += `\n\nFICHAS TÉCNICAS DISPONIBLES:\n\n${contextosPDF.join('\n\n')}`;
    }

    // Preparar mensajes (solo texto, sin documentos binarios)
    const claudeMessages = messages.map(m => ({
      role   : m.role,
      content: m.content
    }));

    const response = await client.messages.create({
      model     : "claude-haiku-4-5-20251001",  // Haiku: más rápido, evita timeout
      max_tokens: 2048,
      system    : systemPrompt,
      messages  : claudeMessages
    });

    const reply = response.content[0]?.text || "Sin respuesta.";
    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Error en chat:", err);
    return res.status(500).json({ error: "Error interno del servidor: " + err.message });
  }
};

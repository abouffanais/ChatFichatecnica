// api/chat.js — Vercel serverless function
// Lee fichas tecnicas desde archivos .txt (extraidos de PDFs, mucho mas livianos)

const Anthropic = require("@anthropic-ai/sdk");
const fs        = require("fs");
const path      = require("path");

const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TEXTS_DIR = path.join(process.cwd(), "netlify", "functions", "texts");

// Lee el texto de una ficha tecnica (.txt)
function leerTextoFicha(filename) {
  try {
    const base    = path.basename(filename).replace(/\.pdf$/i, "");
    const txtPath = path.join(TEXTS_DIR, base + ".txt");
    if (!fs.existsSync(txtPath)) return null;
    return fs.readFileSync(txtPath, "utf-8").trim() || null;
  } catch (e) {
    console.error("Error leyendo ficha:", filename, e.message);
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

    // Cargar texto de las fichas seleccionadas
    const contextosFicha = [];
    for (const product of products) {
      const filename = product.path || product.filename;
      if (filename) {
        const texto = leerTextoFicha(filename);
        if (texto) {
          contextosFicha.push(
            `=== FICHA TECNICA: ${product.name || filename} (SKU: ${product.sku || "N/A"}) ===\n${texto}`
          );
        }
      }
    }

    // System prompt con contexto de fichas tecnicas
    let systemPrompt = `Eres un asistente experto de Kitchen Center.
Ayudas a equipos de ventas y tecnicos a consultar fichas tecnicas de productos.
Responde siempre en espanol, de forma clara y profesional.
Si te preguntan por especificaciones, medidas, caracteristicas o comparaciones,
usa unicamente la informacion de las fichas tecnicas proporcionadas.
Cuando hagas comparaciones, usa tablas en formato Markdown.`;

    if (contextosFicha.length > 0) {
      systemPrompt += `\n\nFICHAS TECNICAS DISPONIBLES:\n\n${contextosFicha.join("\n\n")}`;
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

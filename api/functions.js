import { SYSTEM_PROMPT } from "../prompts/spiderman.js";
import { toGeminiContents, getReplyText } from "../src/utils.js";

// =====================================================
// CONFIGURACIÓN: la decide el servidor, nunca el cliente
// =====================================================
const MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_MESSAGES = 20; // límite del historial que se envía

// =====================================================
// HANDLER: Vercel ejecuta esta función en cada petición a /api/functions
// =====================================================
export default async function handler(req, res) {
  // 1. Solo POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // 2. Validar la entrada
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res
      .status(400)
      .json({ error: "Se esperaba un array 'messages' no vacío" });
  }

  // 3. Leer la key (vive en .env / variables de Vercel, nunca en el frontend)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Falta la variable de entorno GEMINI_API_KEY");
    return res
      .status(500)
      .json({ error: "Error de configuración del servidor" });
  }
  // El modelo no tiene reloj: le damos la fecha y hora actual en cada petición
  const now = new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const systemText = `${SYSTEM_PROMPT}\n\nFecha y hora actual: ${now} (hora de Colombia). Úsalo solo si el usuario pregunta por la fecha, el día o la hora.`;
  // 4. Convertir al formato de Gemini
  const contents = toGeminiContents(messages, MAX_MESSAGES);
  if (contents.length === 0) {
    return res.status(400).json({ error: "No hay mensajes del usuario" });
  }

  try {
    // 5. Llamar a Gemini (la key va en un header, no en la URL)
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingLevel: "low" },
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      }),
    });

    const data = await response.json();

    // 6. Errores de Gemini: el detalle solo en los logs del servidor
    if (response.status === 429) {
      return res
        .status(429)
        .json({ error: "Demasiadas peticiones, intenta en unos segundos" });
    }
    if (!response.ok) {
      console.error("Error de Gemini:", response.status, data?.error?.message);
      return res
        .status(502)
        .json({ error: "No se pudo obtener respuesta del modelo" });
    }

    // 7 y 8. Extraer el texto y responder
    return res.status(200).json({ reply: getReplyText(data) });
  } catch (error) {
    // 9. Error de red o inesperado
    console.error("Error en la función:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

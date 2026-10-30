// =====================================================
// FUNCIONES PURAS: reciben datos y devuelven datos.
// Sin document ni fetch, para poder usarlas en el navegador,
// en la función serverless (Node) y en los tests.
// =====================================================

export const FALLBACK_REPLY = "Mi sentido arácnido se confundió, ¿me lo repites?";

// Decide la clase CSS y el nombre que se muestra según quién habla
export function getMessageMeta(role) {
  const isUser = role === "user";
  return {
    roleClass: isUser ? "message--user" : "message--character",
    author: isUser ? "Tú" : "Spider-Man",
  };
}

// true si el texto tiene algo más que espacios
export function isValidMessage(text) {
  return typeof text === "string" && text.trim().length > 0;
}

// { role, text } → { role, parts: [{ text }] }, el formato de Gemini
export function toGeminiContents(messages, max = 20) {
  const contents = messages.slice(-max).map((message) => ({
    role: message.role === "user" ? "user" : "model",
    parts: [{ text: String(message.text) }],
  }));

  // Gemini espera que la conversación empiece con "user":
  // quitamos el saludo inicial y cualquier "model" que vaya antes
  const firstUser = contents.findIndex((content) => content.role === "user");
  return firstUser === -1 ? [] : contents.slice(firstUser);
}

// Lee el texto de forma segura (si Gemini bloquea algo, parts viene vacío)
export function getReplyText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((part) => !part?.thought) // ignorar el razonamiento interno
    .map((part) => part?.text)
    .filter((t) => typeof t === "string")
    .join("")
    .trim();
  return text || FALLBACK_REPLY;
}

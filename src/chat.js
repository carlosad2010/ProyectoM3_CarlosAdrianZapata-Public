import { getMessageMeta, isValidMessage, formatTime } from "./utils.js";

// =====================================================
// 1. DATOS: el historial de la conversación
// =====================================================
// Está FUERA de las funciones para que se cree una sola vez
// y no se pierda al ir a About y volver al chat.
// time: momento en que se creó el mensaje (no se envía a Gemini)
const messages = [
  {
    role: "model",
    text: "¡Ey, hola! 🕷️ Soy tu vecino amigable. ¿Qué aventura tenemos hoy?",
    time: Date.now(),
  },
];

// Iconos del botón de copiar (SVG en línea, usan el color del texto)
const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

// =====================================================
// 2. VISTA: el HTML del chat (lo usa app.js)
// =====================================================
export function chatView() {
  return `
        <header class="app-header">
            <div class="app-header__avatar" aria-hidden="true"><img src="/assets/spider-emblem.svg" alt="" /></div>
            <div>
                <h1 class="app-title">Spider-Man</h1>
                <p class="app-subtitle"><span class="status-dot"></span>En línea · Tu vecino amigable</p>
            </div>
        </header>
        <section class="messages" id="messages" aria-live="polite"></section>
        <form class="input-area" id="chat-form">
            <input type="text" id="message-input" class="chat-input" placeholder="Escribe tu mensaje..." autocomplete="off" />
            <button type="submit" id="send-button" class="chat-send">Enviar</button>
        </form>`;
}

// =====================================================
// 3. CREAR UN MENSAJE: recibe { role, text } y devuelve un <div>
// =====================================================
function createMessageElement(message) {
  // Bloque 1: ¿quién habla? → decide clase y nombre
  const { roleClass, author } = getMessageMeta(message.role);

  // Bloque 2: la caja → <div class="message message--user">
  const div = document.createElement("div");
  div.classList.add("message", roleClass);

  // Bloque 3: el autor → <span class="message__author">Tú</span>
  const span = document.createElement("span");
  span.classList.add("message__author");
  span.textContent = author;

  // Bloque 4: el texto → <p class="message__text">Hola</p>
  // textContent (no innerHTML) para que el texto nunca se ejecute como HTML
  const p = document.createElement("p");
  p.classList.add("message__text");
  p.textContent = message.text;

  // Bloque 5: el pie → hora y, en las respuestas de Spider-Man, botón de copiar
  const meta = document.createElement("div");
  meta.classList.add("message__meta");

  const time = document.createElement("time");
  time.classList.add("message__time");
  time.dateTime = new Date(message.time).toISOString();
  time.textContent = formatTime(message.time);
  meta.append(time);

  if (message.role === "model") {
    meta.append(createCopyButton(message.text));
  }

  // Bloque 6: meter todo dentro del div, y devolverlo
  div.append(span, p, meta);
  return div;
}

// Botón miniatura que copia el texto de la respuesta al portapapeles
function createCopyButton(text) {
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("message__copy");
  button.setAttribute("aria-label", "Copiar respuesta");
  button.title = "Copiar respuesta";
  button.innerHTML = COPY_ICON; // el ícono es nuestro, no texto del usuario

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);

      // confirmación: el ícono cambia a ✓ por un momento
      button.innerHTML = CHECK_ICON;
      button.classList.add("message__copy--done");
      button.setAttribute("aria-label", "Respuesta copiada");
      setTimeout(() => {
        button.innerHTML = COPY_ICON;
        button.classList.remove("message__copy--done");
        button.setAttribute("aria-label", "Copiar respuesta");
      }, 1500);
    } catch (error) {
      console.error("No se pudo copiar:", error);
    }
  });

  return button;
}

// =====================================================
// 4. DIBUJAR TODOS LOS MENSAJES del array en la pantalla
// =====================================================
function renderMessages() {
  const container = document.getElementById("messages");

  // vaciar primero, si no los mensajes se duplican
  container.innerHTML = "";

  // por cada mensaje del array: crear su <div> y agregarlo
  messages.forEach((message) => {
    container.append(createMessageElement(message));
  });

  // bajar el scroll para que el último mensaje quede a la vista
  container.scrollTop = container.scrollHeight;
}

// =====================================================
// 5. INDICADORES: "escribiendo…" y errores (no van al historial)
// =====================================================
function showTyping() {
  const container = document.getElementById("messages");

  const div = document.createElement("div");
  div.classList.add("message", "message--character", "message--typing");
  div.textContent = "Spider-Man está escribiendo";

  // tres puntos animados con CSS
  const dots = document.createElement("span");
  dots.classList.add("typing-dots");
  dots.setAttribute("aria-hidden", "true"); // el lector de pantalla no lee "punto punto punto"
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.textContent = ".";
    dots.append(dot);
  }
  div.append(dots);

  container.append(div);
  container.scrollTop = container.scrollHeight;
}

function showError(text) {
  const container = document.getElementById("messages");

  const div = document.createElement("div");
  div.classList.add("message", "message--error");
  div.setAttribute("role", "alert"); // el lector de pantalla lo anuncia
  div.textContent = text;

  container.append(div);
  container.scrollTop = container.scrollHeight;
}

// =====================================================
// 6. PEDIR LA RESPUESTA a nuestra función serverless
// =====================================================
async function fetchReply() {
  const response = await fetch("/api/functions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // se envía el historial completo (paso 8); la función lo recorta
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const error = new Error("Error HTTP " + response.status);
    error.status = response.status; // para distinguir el 429
    throw error;
  }

  const data = await response.json();
  return data.reply;
}

// =====================================================
// 7. INICIO: lo llama app.js cada vez que se dibuja /chat
// =====================================================
export function initChat() {
  renderMessages();

  // el form solo existe después de que app.js pinta la vista
  const form = document.getElementById("chat-form");
  const input = document.getElementById("message-input");
  const button = document.getElementById("send-button");

  // "submit" cubre el botón Enviar y la tecla Enter
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // evita que la página se recargue

    if (!isValidMessage(input.value)) return; // no enviar mensajes vacíos
    const text = input.value.trim();

    messages.push({ role: "user", text, time: Date.now() });
    renderMessages();
    input.value = "";

    // bloquear mientras responde
    input.disabled = true;
    button.disabled = true;
    showTyping();

    let errorText = null;

    try {
      const reply = await fetchReply();
      messages.push({ role: "model", text: reply, time: Date.now() });
    } catch (error) {
      console.error(error);

      // quitar el mensaje fallido y devolverlo al input para reintentar
      messages.pop();
      input.value = text;

      errorText =
        error.status === 429
          ? "¡Uf! Demasiadas telarañas a la vez. Espera unos segundos e intenta de nuevo."
          : "Mi sentido arácnido perdió la señal 📡. Intenta de nuevo.";
    } finally {
      // siempre: redibujar (borra el "escribiendo…") y desbloquear
      renderMessages();
      if (errorText) showError(errorText);

      input.disabled = false;
      button.disabled = false;
      input.focus();
    }
  });
}

import { chatView, initChat } from "./chat.js";

function homeView() {
  return `
        <section class="home">
            <div class="home__avatar" aria-hidden="true">🕷️</div>
            <h1 class="home__title">Bienvenido a SpiderChat</h1>
            <p class="home__intro">
                Chatea con Peter Parker, el joven de Queens que se convirtió en Spider-Man
                tras la picadura de una araña radiactiva. Habla como en los cómics: rápido,
                con humor y siempre dispuesto a echarte una mano.
            </p>
            <ul class="home__traits" aria-label="Personalidad de Spider-Man">
                <li class="trait"><span aria-hidden="true">🕸️</span> Ingenioso</li>
                <li class="trait"><span aria-hidden="true">😄</span> Bromista</li>
                <li class="trait"><span aria-hidden="true">💙</span> Empático</li>
            </ul>
            <a href="/chat" class="btn" data-link>Empezar a chatear</a>
        </section>
    `;
}

function aboutView() {
  return `
    <section class="about">
        <h1>Acerca del proyecto</h1>
        <p>Esta aplicación es un ejercicio académico: un chat con la personalidad de Spider-Man.</p>

        <h2>El proyecto</h2>
        <p>El objetivo es aplicar los conceptos del Módulo 3, como:</p>
        <ul>
            <li>Routing SPA usando History API.</li>
            <li>Tres vistas principales: Home, Chat y About.</li>
            <li>Integrar Google Gemini AI mediante una Vercel Serverless Function.</li>
            <li>Mantener el historial de conversación durante la sesión.</li>
            <li>Aplicar los demás conceptos vistos en el Módulo 3.</li>
        </ul>

        <h2>¿Quién es Spider-Man?</h2>
        <ul>
            <li><strong>Su origen:</strong> es un joven huérfano de Queens, Nueva York, que adquiere habilidades especiales (fuerza sobrehumana, agilidad y trepar muros) tras ser mordido por una araña radiactiva.</li>
            <li><strong>La gran lección:</strong> tras la trágica muerte de su tío Ben —por no haber detenido a un ladrón a tiempo—, asume la regla de oro: "un gran poder conlleva una gran responsabilidad".</li>
            <li><strong>Su lado humano:</strong> a diferencia de otros héroes ricos o invencibles, Peter lidia con problemas cotidianos como pagar la renta, el trabajo, los estudios y el desamor, lo que lo hace muy cercano a la gente.</li>
        </ul>

        <h2>¿Cómo habla?</h2>
        <ul>
            <li><strong>Con humor y sarcasmo:</strong> mientras pelea contra los villanos, Spider-Man no para de hablar, hacer chistes y soltar comentarios irónicos. Lo hace para disimular sus nervios y, al mismo tiempo, desquiciar a sus enemigos.</li>
        </ul>
    </section>
    `;
}

const routes = {
  "/home": { title: "Inicio · SpiderChat", view: homeView },
  "/chat": { title: "Chat · SpiderChat", view: chatView, init: initChat },
  "/about": { title: "Acerca de · SpiderChat", view: aboutView },
};

function render() {
  const path = location.pathname;
  const route = routes[path];

  if (!route) {
    history.replaceState(null, "", "/home");
    render();
    return;
  }

  document.getElementById("view").innerHTML = route.view();
  document.title = route.title;
  updateActiveLink(path);
  if (route.init) route.init();
}

function updateActiveLink(path) {
  document.querySelectorAll(".app-nav__link").forEach((link) => {
    if (link.getAttribute("href") === path) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function navigateTo(url) {
  history.pushState(null, "", url);
  render();
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-link]");
  if (!link) return;
  if (event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  navigateTo(link.getAttribute("href"));
});
window.addEventListener("popstate", render);
render();

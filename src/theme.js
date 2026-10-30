// =====================================================
// MODO CLARO / OSCURO
// El tema inicial lo aplica el script del <head> de index.html;
// aquí solo se maneja el botón del nav.
// =====================================================

function getTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// el aria-label describe la acción que hará el botón, no el estado actual
function updateToggleLabel(button) {
  const nextTheme = getTheme() === "dark" ? "claro" : "oscuro";
  button.setAttribute("aria-label", `Activar modo ${nextTheme}`);
}

export function initThemeToggle() {
  const button = document.getElementById("theme-toggle");
  if (!button) return;

  updateToggleLabel(button);

  button.addEventListener("click", () => {
    const theme = getTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    updateToggleLabel(button);

    // recordar la elección (puede fallar en modo privado: no pasa nada)
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* sin almacenamiento, el tema dura solo esta visita */
    }
  });
}

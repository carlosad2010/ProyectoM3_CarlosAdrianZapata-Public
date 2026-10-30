import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "../api/functions.js";

// Simula el objeto res de Vercel: status() devuelve res para poder encadenar .json()
function createRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

// Simula la respuesta de fetch (lo que devolvería Gemini)
function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

const validBody = { messages: [{ role: "user", text: "Hola" }] };

describe("handler de /api/functions", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "clave-de-prueba");
    vi.spyOn(console, "error").mockImplementation(() => {}); // silenciar logs esperados
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("responde 405 si el método no es POST", async () => {
    const res = createRes();
    await handler({ method: "GET" }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("responde 400 si messages está vacío", async () => {
    const res = createRes();
    await handler({ method: "POST", body: { messages: [] } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("responde 500 si falta la API key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = createRes();
    await handler({ method: "POST", body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("responde 200 con la respuesta de Gemini y envía la key en el header", async () => {
    const fetchMock = mockFetch(200, {
      candidates: [{ content: { parts: [{ text: "¡Hola, amigo!" }] } }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = createRes();
    await handler({ method: "POST", body: validBody }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ reply: "¡Hola, amigo!" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).not.toContain("clave-de-prueba"); // la key nunca va en la URL
    expect(options.headers["x-goog-api-key"]).toBe("clave-de-prueba");
  });

  it("responde 429 si Gemini indica demasiadas peticiones", async () => {
    vi.stubGlobal("fetch", mockFetch(429, { error: { message: "quota" } }));
    const res = createRes();
    await handler({ method: "POST", body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("responde 502 si Gemini devuelve otro error", async () => {
    vi.stubGlobal("fetch", mockFetch(400, { error: { message: "bad request" } }));
    const res = createRes();
    await handler({ method: "POST", body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });
});

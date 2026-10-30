import { describe, it, expect } from "vitest";
import {
  FALLBACK_REPLY,
  getMessageMeta,
  isValidMessage,
  toGeminiContents,
  getReplyText,
} from "../src/utils.js";

describe("getMessageMeta", () => {
  it("devuelve la clase y el nombre del usuario", () => {
    expect(getMessageMeta("user")).toEqual({
      roleClass: "message--user",
      author: "Tú",
    });
  });

  it("devuelve la clase y el nombre de Spider-Man", () => {
    expect(getMessageMeta("model")).toEqual({
      roleClass: "message--character",
      author: "Spider-Man",
    });
  });
});

describe("isValidMessage", () => {
  it("rechaza mensajes vacíos o con solo espacios", () => {
    expect(isValidMessage("")).toBe(false);
    expect(isValidMessage("   ")).toBe(false);
  });

  it("acepta mensajes con texto", () => {
    expect(isValidMessage("  hola  ")).toBe(true);
  });
});

describe("toGeminiContents", () => {
  it("convierte { role, text } al formato { role, parts } de Gemini", () => {
    const result = toGeminiContents([{ role: "user", text: "Hola" }]);
    expect(result).toEqual([{ role: "user", parts: [{ text: "Hola" }] }]);
  });

  it("quita el saludo inicial del modelo para empezar con el usuario", () => {
    const result = toGeminiContents([
      { role: "model", text: "¡Ey, hola!" },
      { role: "user", text: "Hola" },
      { role: "model", text: "¿Qué tal?" },
    ]);
    expect(result.map((content) => content.role)).toEqual(["user", "model"]);
  });

  it("respeta el máximo de mensajes, quedándose con los más recientes", () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: "user",
      text: `mensaje ${i}`,
    }));
    const result = toGeminiContents(messages, 3);
    expect(result).toHaveLength(3);
    expect(result[2].parts[0].text).toBe("mensaje 9");
  });

  it("devuelve un array vacío si no hay mensajes del usuario", () => {
    expect(toGeminiContents([{ role: "model", text: "Hola" }])).toEqual([]);
  });
});

describe("getReplyText", () => {
  it("extrae el texto de una respuesta normal de Gemini", () => {
    const data = { candidates: [{ content: { parts: [{ text: " ¡Hola! " }] } }] };
    expect(getReplyText(data)).toBe("¡Hola!");
  });

  it("ignora las partes de razonamiento interno (thought)", () => {
    const data = {
      candidates: [
        {
          content: {
            parts: [
              { text: "pensando en inglés...", thought: true },
              { text: "Respuesta final" },
            ],
          },
        },
      ],
    };
    expect(getReplyText(data)).toBe("Respuesta final");
  });

  it("devuelve el mensaje de respaldo si la respuesta viene vacía", () => {
    expect(getReplyText({ candidates: [{ content: { parts: [] } }] })).toBe(FALLBACK_REPLY);
    expect(getReplyText({})).toBe(FALLBACK_REPLY);
  });
});

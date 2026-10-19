import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { testAuth } from "./auth-mock";

// Вход через Google в тестах не настоящий: сессию задаёт signInAs из tests/auth-mock.ts.
vi.mock("@/lib/session", async () => {
  const { testAuth } = await import("./auth-mock");
  return {
    authEnabled: () => testAuth.enabled,
    authRequired: () => testAuth.enabled && testAuth.required,
    currentUser: async () => testAuth.user,
  };
});

afterEach(() => {
  if (typeof window !== "undefined") cleanup();
  testAuth.enabled = false;
  testAuth.required = true;
  testAuth.user = null;
});

if (typeof window !== "undefined") {
  // Node ≥ 25 сам объявляет localStorage/sessionStorage (localStorage без --localstorage-file — undefined), и Vitest
  // не заменяет их хранилищами jsdom. Ставим хранилища jsdom (JSDOM — глобальный `jsdom` от Vitest); на Node 20
  // они и так те же. Геттер Node не трогаем: он печатает предупреждение.
  const { jsdom } = globalThis as { jsdom?: { window: Window } };
  if (jsdom) {
    for (const key of ["localStorage", "sessionStorage"] as const) {
      Object.defineProperty(globalThis, key, { value: jsdom.window[key], configurable: true, writable: true });
    }
  }
  // jsdom не умеет воспроизводить медиа и рисовать на canvas. События play/pause — как в браузере.
  window.HTMLMediaElement.prototype.play = function () {
    const wasPaused = this.paused;
    Object.defineProperty(this, "paused", { value: false, configurable: true });
    if (wasPaused) this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () {
    const wasPaused = this.paused;
    Object.defineProperty(this, "paused", { value: true, configurable: true });
    if (!wasPaused) this.dispatchEvent(new Event("pause"));
  };
  window.HTMLCanvasElement.prototype.getContext = (() => null) as never;
  // Radix UI (слайдеры, диалоги) использует API, которых нет в jsdom.
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.hasPointerCapture ??= () => false;
  window.HTMLElement.prototype.setPointerCapture ??= () => {};
  window.HTMLElement.prototype.releasePointerCapture ??= () => {};
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  window.HTMLElement.prototype.scrollTo ??= () => {};
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    // Устаревшие addListener/removeListener: ими подписывается next-themes (кнопка темы сайта).
    addListener() {},
    removeListener() {},
  })) as never;
}

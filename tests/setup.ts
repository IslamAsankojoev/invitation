import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { testAuth } from "./auth-mock";

// Вход через Google в тестах не настоящий: сессию задаёт signInAs из tests/auth-mock.ts.
vi.mock("@/lib/session", async () => {
  const { testAuth } = await import("./auth-mock");
  return { authEnabled: () => testAuth.enabled, currentUser: async () => testAuth.user };
});

afterEach(() => {
  if (typeof window !== "undefined") cleanup();
  testAuth.enabled = false;
  testAuth.user = null;
});

if (typeof window !== "undefined") {
  // jsdom не умеет воспроизводить медиа и рисовать на canvas.
  window.HTMLMediaElement.prototype.play = function () {
    Object.defineProperty(this, "paused", { value: false, configurable: true });
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () {
    Object.defineProperty(this, "paused", { value: true, configurable: true });
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
  })) as never;
}

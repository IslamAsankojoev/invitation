import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E-сервер собирается в отдельную папку, чтобы не конфликтовать с запущенным `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Нужен для forbidden() — настоящий ответ 403 в редакторе без верного token.
  experimental: { authInterrupts: true },
  // Значок dev-режима «N» в углу перекрывал нижнюю панель редактора на телефоне (и кнопки в E2E). Ошибки сборки
  // Next по-прежнему показывает.
  devIndicators: false,
};

export default nextConfig;

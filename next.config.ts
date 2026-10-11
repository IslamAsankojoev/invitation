import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E-сервер собирается в отдельную папку, чтобы не конфликтовать с запущенным `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Нужен для forbidden() — настоящий ответ 403 в редакторе без верного token.
  experimental: { authInterrupts: true },
  // Значок dev-режима «N» в углу перекрывал нижнюю панель редактора на телефоне (и кнопки в E2E). Ошибки сборки
  // Next по-прежнему показывает.
  devIndicators: false,
  // Dev-сервер с телефона по Wi-Fi (http://192.168.x.x:3000): без этого Next 15 не отдаёт скрипты и HMR чужому
  // адресу. Маски — любой IP домашней/офисной сети, чтобы смена сети не требовала правки конфига.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;

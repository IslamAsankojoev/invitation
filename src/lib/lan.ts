import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";

/** Частные сети: домашний/офисный Wi-Fi (192.168.x.x, 10.x.x.x, 172.16–31.x.x). */
const isPrivate = (ip: string) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);

/** IPv4-адреса компьютера в локальной сети: без внутренних (127.0.0.1) и публичных; сначала 192.168.x.x. */
export function pickLanIps(interfaces: Record<string, NetworkInterfaceInfo[] | undefined>): string[] {
  const ips = Object.values(interfaces)
    .flatMap((list) => list ?? [])
    .filter((i) => i.family === "IPv4" && !i.internal && isPrivate(i.address))
    .map((i) => i.address);
  return [...new Set(ips)].sort((a, b) => Number(b.startsWith("192.168.")) - Number(a.startsWith("192.168.")));
}

/**
 * Адрес dev-сервера в Wi-Fi сети (`http://192.168.0.107:3000`) — чтобы открыть приглашение с телефона.
 * Только в разработке; IP берётся при каждом вызове, так что смена сети подхватывается сама. host — заголовок
 * запроса (из него порт). Нет сети — null.
 */
export function devLanOrigin(host: string | null): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  const ip = pickLanIps(networkInterfaces())[0];
  if (!ip) return null;
  const port = host?.match(/:(\d+)$/)?.[1] ?? process.env.PORT ?? "3000";
  return `http://${ip}:${port}`;
}

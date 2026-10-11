import type { NetworkInterfaceInfo } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { devLanOrigin, pickLanIps } from "@/lib/lan";

const v4 = (address: string, internal = false) => ({ address, family: "IPv4", internal }) as NetworkInterfaceInfo;

describe("адрес dev-сервера в Wi-Fi сети", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("берёт только частные IPv4, без 127.0.0.1, IPv6 и публичных; сначала 192.168.x.x", () => {
    expect(
      pickLanIps({
        lo0: [v4("127.0.0.1", true)],
        en0: [v4("10.0.0.5"), { address: "fe80::1", family: "IPv6", internal: false } as NetworkInterfaceInfo],
        en1: [v4("192.168.0.107")],
        utun: [v4("8.8.8.8"), v4("172.20.1.3")],
        none: undefined,
      }),
    ).toEqual(["192.168.0.107", "10.0.0.5", "172.20.1.3"]);
    expect(pickLanIps({ lo0: [v4("127.0.0.1", true)] })).toEqual([]);
  });

  it("только в разработке; порт — из заголовка host", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(devLanOrigin("localhost:3001")).toBeNull();
    vi.stubEnv("NODE_ENV", "development");
    const origin = devLanOrigin("localhost:3001");
    // В песочнице тестов сети может не быть — тогда null; есть — http://<частный IP>:3001.
    if (origin) expect(origin).toMatch(/^http:\/\/(192\.168|10|172)\.[\d.]+:3001$/);
  });
});

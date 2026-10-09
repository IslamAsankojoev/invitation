"use client";

import { Download, QrCode as QrIcon } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * QR-код ссылки для бумажных приглашений: пожилые гости и те, кому удобнее открыть сайт камерой.
 * Картинка для печати — PNG 1024 px с полями.
 */
export function QrCode({ url, fileName }: { url: string; fileName: string }) {
  const [svg, setSvg] = useState("");
  const [png, setPng] = useState("");
  useEffect(() => {
    if (!url.startsWith("http")) return;
    let alive = true;
    const options = { errorCorrectionLevel: "M" as const, margin: 2 };
    Promise.all([QRCode.toString(url, { ...options, type: "svg" }), QRCode.toDataURL(url, { ...options, width: 1024 })])
      .then(([s, p]) => {
        if (!alive) return;
        setSvg(s);
        setPng(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <details className="group text-sm">
      <summary className="flex cursor-pointer items-center gap-2 text-muted-foreground">
        <QrIcon className="size-4" /> QR-код для бумажных приглашений
      </summary>
      <div className="mt-3 flex items-center gap-4">
        {svg ? (
          // SVG собран библиотекой из нашей же ссылки — безопасно вставлять разметкой.
          <div data-testid="qr-code" role="img" aria-label="QR-код ссылки для гостей" className="size-32 shrink-0 rounded-md border bg-white [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="size-32 shrink-0 rounded-md border bg-muted" />
        )}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Напечатайте на открытке — гость наведёт камеру телефона и откроет приглашение.</p>
          <Button asChild variant="outline" size="sm" className="self-start" disabled={!png}>
            <a href={png || undefined} download={fileName}>
              <Download /> Скачать PNG
            </a>
          </Button>
        </div>
      </div>
    </details>
  );
}

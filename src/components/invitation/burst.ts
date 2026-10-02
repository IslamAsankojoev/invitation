const PETALS = ["/library/petal-red.webp", "/library/petal-pink.webp"];
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Салют из сердечек и лепестков, вылетающий из элемента (кнопки «Подтвердить»): разлетаются вверх и падают.
 * Цвет сердечек — от акцента палитры. Слой временный, удаляется после анимации.
 */
export function heartBurst(from: HTMLElement, count = 26) {
  if (typeof from.animate !== "function") return;
  const b = from.getBoundingClientRect();
  const accent = getComputedStyle(from).getPropertyValue("--accent").trim() || "#c9a87c";
  const colors = [
    accent,
    `color-mix(in srgb, ${accent} 60%, white)`,
    `color-mix(in srgb, ${accent} 55%, #e3a6a1)`,
    `color-mix(in srgb, ${accent} 80%, black)`,
  ];
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;z-index:70;overflow:hidden;pointer-events:none";
  document.body.appendChild(layer);

  const animations = Array.from({ length: count }, (_, i) => {
    const petal = i % 3 === 0;
    const el = document.createElement(petal ? "img" : "span");
    el.style.cssText = `position:absolute;line-height:1;opacity:0;left:${(b.left + rand(0.2, 0.8) * b.width).toFixed(0)}px;top:${(b.top + b.height / 2).toFixed(0)}px`;
    if (el instanceof HTMLImageElement) {
      el.src = PETALS[i % PETALS.length];
      el.alt = "";
      el.style.width = `${rand(12, 20).toFixed(0)}px`;
    } else {
      el.textContent = "♥";
      el.style.fontSize = `${rand(10, 20).toFixed(0)}px`;
      el.style.color = colors[i % colors.length];
    }
    layer.appendChild(el);

    // Вылет веером вверх, затем падение с вращением.
    const angle = rand(-Math.PI * 0.9, -Math.PI * 0.1);
    const power = rand(90, 220);
    const dx = Math.cos(angle) * power;
    const dy = Math.sin(angle) * power;
    const spin = rand(-260, 260);
    const at = (x: number, y: number, scale: number, rotate: number) =>
      `translate(calc(-50% + ${x.toFixed(0)}px), calc(-50% + ${y.toFixed(0)}px)) scale(${scale}) rotate(${rotate.toFixed(0)}deg)`;
    return el.animate(
      [
        { transform: at(0, 0, 0.2, 0), opacity: 0 },
        { transform: at(dx * 0.55, dy * 0.55, 1, spin * 0.4), opacity: 1, offset: 0.25 },
        { transform: at(dx, dy + 40, 0.9, spin * 0.8), opacity: 0.9, offset: 0.6 },
        { transform: at(dx * 1.15, dy + 160, 0.7, spin), opacity: 0 },
      ],
      { duration: rand(1400, 2200), delay: rand(0, 120), easing: "cubic-bezier(.2,.6,.35,1)", fill: "both" },
    );
  });
  Promise.all(animations.map((a) => a.finished))
    .catch(() => {})
    .then(() => layer.remove());
}

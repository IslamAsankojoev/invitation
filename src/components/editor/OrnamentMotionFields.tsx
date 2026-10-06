"use client";

import { useId } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { idleHasAmplitude } from "@/lib/ornaments";
import { ORNAMENT_ENTERS, ORNAMENT_IDLES, type OrnamentEnter, type OrnamentIdle, type OrnamentMotion } from "@/lib/schema";
import { ornamentEnterLabels, ornamentIdleLabels } from "@/lib/variants";
import { LabeledSlider } from "./BlockStyle";

/** Скорость-множитель словами: 2 → «быстрее ×2», 0.5 → «медленнее ×2». */
const speedLabel = (v: number) =>
  v === 1 ? "обычная" : v > 1 ? `быстрее ×${+v.toFixed(2)}` : `медленнее ×${+(1 / v).toFixed(1)}`;

const round = (v: number, step: number) => Math.round(v / step) * step;

/**
 * Анимация украшения: как появляется (вид, скорость) и что делает потом (вид движения, скорость, размах).
 * Общая для всех украшений («Оформление» → «Анимации») и своя у отдельного украшения.
 * `of` — хвост доступных имён: «украшения 2», «всех украшений».
 */
export function OrnamentMotionFields({
  value,
  of,
  onChange,
}: {
  value: OrnamentMotion;
  of: string;
  onChange: (patch: Partial<OrnamentMotion>) => void;
}) {
  const enterId = useId();
  const idleId = useId();
  const select = "w-full [&_select]:bg-background";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={enterId} className="text-xs text-muted-foreground">
          Появление
        </label>
        <NativeSelect
          id={enterId}
          aria-label={`Появление ${of}`}
          size="sm"
          className={select}
          value={value.enter}
          onChange={(e) => onChange({ enter: e.target.value as OrnamentEnter })}
        >
          {ORNAMENT_ENTERS.map((e) => (
            <NativeSelectOption key={e} value={e}>
              {ornamentEnterLabels[e]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {value.enter !== "none" && (
        <LabeledSlider
          label="Скорость появления"
          ariaLabel={`Скорость появления ${of}`}
          valueLabel={speedLabel(value.enterSpeed)}
          value={value.enterSpeed}
          min={0.25}
          max={3}
          step={0.25}
          onChange={(v) => onChange({ enterSpeed: round(v, 0.25) })}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idleId} className="text-xs text-muted-foreground">
          Движение после появления
        </label>
        <NativeSelect
          id={idleId}
          aria-label={`Движение ${of}`}
          size="sm"
          className={select}
          value={value.idle}
          onChange={(e) => onChange({ idle: e.target.value as OrnamentIdle })}
        >
          {ORNAMENT_IDLES.map((i) => (
            <NativeSelectOption key={i} value={i}>
              {ornamentIdleLabels[i]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {value.idle !== "none" && (
        <LabeledSlider
          label="Скорость движения"
          ariaLabel={`Скорость движения ${of}`}
          valueLabel={speedLabel(value.idleSpeed)}
          value={value.idleSpeed}
          min={0.25}
          max={3}
          step={0.25}
          onChange={(v) => onChange({ idleSpeed: round(v, 0.25) })}
        />
      )}
      {idleHasAmplitude(value.idle) && (
        <LabeledSlider
          label="Сила движения"
          ariaLabel={`Сила движения ${of}`}
          valueLabel={`×${value.idleAmplitude.toFixed(1)}`}
          value={value.idleAmplitude}
          min={0.2}
          max={3}
          step={0.1}
          onChange={(v) => onChange({ idleAmplitude: Math.round(v * 10) / 10 })}
        />
      )}
    </div>
  );
}

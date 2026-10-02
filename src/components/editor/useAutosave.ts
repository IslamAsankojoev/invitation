"use client";

import { useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "saving" | "invalid" | "error";

/**
 * Сохраняет value через `delay` мс после последнего изменения.
 * Если validate вернул ошибки — не сохраняет и отдаёт статус "invalid".
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  validate: (value: T) => string[],
  delay = 800,
) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [errors, setErrors] = useState<string[]>([]);
  const lastSaved = useRef(value);
  const version = useRef(0);
  const saveRef = useRef(save);
  const validateRef = useRef(validate);
  saveRef.current = save;
  validateRef.current = validate;

  useEffect(() => {
    if (value === lastSaved.current) return;
    const errs = validateRef.current(value);
    setErrors(errs);
    if (errs.length) return setStatus("invalid");

    setStatus("saving");
    const current = ++version.current;
    const timer = setTimeout(() => {
      saveRef.current(value).then(
        () => {
          lastSaved.current = value;
          if (current === version.current) setStatus("saved");
        },
        () => current === version.current && setStatus("error"),
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return { status, errors };
}

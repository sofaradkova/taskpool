"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
  duration?: number; // ms, default 4000
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: Toast["variant"] = "info", duration?: number) => {
      const id = crypto.randomUUID();
      const entry: Toast = duration !== undefined
        ? { id, message, variant, duration }
        : { id, message, variant };
      setToasts((prev) => [...prev, entry]);
    },
    [],
  );

  return { toasts, toast, dismiss };
}

"use client";

import { useEffect } from "react";
import type { Toast } from "@/lib/useToast";

interface ToasterProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<Toast["variant"], string> = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-gray-50 border-gray-200 text-gray-800",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-md ${VARIANT_STYLES[toast.variant]}`}
    >
      <p>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 font-medium opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-80">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

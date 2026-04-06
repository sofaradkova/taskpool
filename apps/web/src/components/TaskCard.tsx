"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { TaskStatus } from "@taskpool/types";
import { trpc } from "@/lib/trpc";

const STATUS_BADGE: Record<TaskStatus, { label: string; className: string }> = {
  UNCLAIMED: { label: "Unclaimed", className: "bg-gray-100 text-gray-600" },
  CLAIMED: { label: "Claimed", className: "bg-yellow-100 text-yellow-700" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  DONE: { label: "Done", className: "bg-green-100 text-green-700" },
};

export interface TaskCardTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  version: number;
  claimedBy: string | null;
  roomId: string;
}

interface TaskCardProps {
  task: TaskCardTask;
  participantId: string | null;
  onToast: (message: string, variant: "success" | "error" | "info") => void;
}

export function TaskCard({ task, participantId, onToast }: TaskCardProps) {
  const badge = STATUS_BADGE[task.status];
  const utils = trpc.useUtils();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { task, participantId },
      // Any non-UNCLAIMED card owned by this participant is draggable
      disabled: task.status === "UNCLAIMED" || task.claimedBy !== participantId,
    });

  const claim = trpc.task.claim.useMutation({
    onSuccess: async () => {
      await utils.room.get.invalidate({ roomId: task.roomId });
      onToast("Task claimed!", "success");
    },
    onError: (err) => {
      onToast(
        err.data?.code === "CONFLICT"
          ? "Claim failed — someone else got there first."
          : (err.message ?? "Failed to claim task."),
        "error",
      );
    },
  });

  const handleClaim = () => {
    if (!participantId) {
      onToast("Join the room before claiming a task.", "info");
      return;
    }
    claim.mutate({ taskId: task.id, participantId, expectedVersion: task.version });
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(task.status !== "UNCLAIMED" ? listeners : {})}
      {...(task.status !== "UNCLAIMED" ? attributes : {})}
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${
        task.claimedBy === participantId && task.status !== "UNCLAIMED"
          ? "cursor-grab active:cursor-grabbing"
          : ""
      }`}
    >
      {/* Title + badge */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="mt-1.5 text-xs text-gray-500">{task.description}</p>
      )}

      {/* Claimed by */}
      {task.claimedBy && (
        <p className="mt-2 text-xs text-gray-400">
          Claimed by{" "}
          <span className="font-medium text-gray-600">{task.claimedBy}</span>
        </p>
      )}

      {/* Claim button — only on UNCLAIMED tasks */}
      {task.status === "UNCLAIMED" && (
        <button
          onClick={handleClaim}
          disabled={claim.isPending}
          className={`mt-3 w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            claim.isPending
              ? "cursor-not-allowed bg-gray-200 text-gray-500"
              : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          {claim.isPending ? "Claiming…" : "Claim"}
        </button>
      )}
    </div>
  );
}

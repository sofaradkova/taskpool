"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { TaskStatus } from "@taskpool/types";
import { trpc } from "@/lib/trpc";

const STATUS_DOT: Record<TaskStatus, string> = {
  UNCLAIMED:   "bg-[#79747E]",
  CLAIMED:     "bg-[#6750A4]",
  IN_PROGRESS: "bg-[#B45309]",
  DONE:        "bg-[#0F766E]",
};

export interface TaskCardTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  version: number;
  claimedBy: string | null;
  claimedByName: string | null;
  eventId: string;
}

interface TaskCardProps {
  task: TaskCardTask;
  participantId: string | null;
  onToast: (message: string, variant: "success" | "error" | "info") => void;
}

export function TaskCard({ task, participantId, onToast }: TaskCardProps) {
  const isOwned = task.claimedBy === participantId;
  const isGrayed = task.status !== "UNCLAIMED" && !isOwned;
  const utils = trpc.useUtils();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task, participantId },
    disabled: task.status === "UNCLAIMED" || task.claimedBy !== participantId,
  });

  const claim = trpc.task.claim.useMutation({
    onSuccess: async () => {
      await utils.event.get.invalidate({ eventId: task.eventId });
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
      className={`rounded-2xl border border-[#ECE6F0] bg-white p-3.5 transition-opacity ${
        isGrayed ? "opacity-40" : ""
      } ${isOwned && task.status !== "UNCLAIMED" ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[task.status]}`} />
        <p className="text-sm font-medium leading-snug text-[#1C1B1F]">{task.title}</p>
      </div>

      {task.description && (
        <p className="mt-1.5 pl-3.5 text-xs text-[#79747E] leading-relaxed">{task.description}</p>
      )}

      {task.claimedByName && (
        <p className="mt-2 pl-3.5 text-xs text-[#79747E]">
          {isOwned ? "Claimed by you" : `Claimed by ${task.claimedByName}`}
        </p>
      )}

      {task.status === "UNCLAIMED" && (
        <button
          onClick={handleClaim}
          disabled={claim.isPending}
          className="mt-3 w-full rounded-full bg-[#6750A4] py-1.5 text-xs font-semibold text-white hover:bg-[#5B4397] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {claim.isPending ? "Claiming…" : "Claim"}
        </button>
      )}
    </div>
  );
}

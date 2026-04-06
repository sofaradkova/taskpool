"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { TaskStatus } from "@taskpool/types";
import { TaskCard, type TaskCardTask } from "@/components/TaskCard";
import { AddTaskForm } from "@/components/AddTaskForm";
import { PresenceStrip } from "@/components/PresenceStrip";
import { JoinModal } from "@/components/JoinModal";
import { Toaster } from "@/components/Toaster";
import { useToast } from "@/lib/useToast";
import { trpc } from "@/lib/trpc";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "UNCLAIMED", label: "Unclaimed" },
  { status: "CLAIMED", label: "Claimed" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "DONE", label: "Done" },
];

// All valid drag transitions (mirrors server-side VALID_SOURCES)
const VALID_TARGETS: Record<TaskStatus, TaskStatus[]> = {
  UNCLAIMED:   [],
  CLAIMED:     ["UNCLAIMED", "IN_PROGRESS"],
  IN_PROGRESS: ["UNCLAIMED", "CLAIMED", "DONE"],
  DONE:        ["UNCLAIMED", "CLAIMED", "IN_PROGRESS"],
};

function DroppableColumn({
  status,
  label,
  children,
  isOver,
}: {
  status: TaskStatus;
  label: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex w-72 flex-shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-20 flex-col gap-2 rounded-lg p-1 transition-colors ${
          isOver ? "bg-blue-50 ring-2 ring-blue-200" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function BoardPage({ params }: { params: { id: string } }) {
  const roomId = params.id;
  const [joinOpen, setJoinOpen] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskCardTask | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const { toasts, toast, dismiss } = useToast();
  const handleToast = useCallback(
    (message: string, variant: "success" | "error" | "info") =>
      toast(message, variant),
    [toast],
  );

  useEffect(() => {
    const stored = localStorage.getItem(`taskpool:participantId:${roomId}`);
    if (stored) setParticipantId(stored);
  }, [roomId]);

  const { data, isLoading, error } = trpc.room.get.useQuery(
    { roomId },
    { retry: false },
  );

  const utils = trpc.useUtils();
  const updateStatus = trpc.task.updateStatus.useMutation({
    onSuccess: () => {
      // Refresh to get the server-incremented version number
      void utils.room.get.invalidate({ roomId });
    },
    onError: (err) => {
      // Revert the optimistic update
      void utils.room.get.invalidate({ roomId });
      toast(err.message ?? "Failed to move task.", "error");
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const tasksByStatus = (status: TaskStatus) =>
    (data?.tasks ?? []).filter((t) => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as TaskCardTask | undefined;
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: { over: { id: unknown } | null }) => {
    setOverColumn((event.over?.id as TaskStatus) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setOverColumn(null);

    const { active, over } = event;
    if (!over || !participantId) return;

    const task = active.data.current?.task as TaskCardTask | undefined;
    if (!task) return;

    const targetStatus = over.id as TaskStatus;
    if (!VALID_TARGETS[task.status]?.includes(targetStatus)) return;

    // Optimistically move the card in the cache so it appears in the new
    // column instantly — no flash back to the old position while the server responds.
    utils.room.get.setData({ roomId }, (old) => {
      if (!old) return old;
      return {
        ...old,
        tasks: old.tasks.map((t) =>
          t.id === task.id ? { ...t, status: targetStatus } : t,
        ),
      };
    });

    updateStatus.mutate({
      taskId: task.id,
      participantId,
      status: targetStatus as "UNCLAIMED" | "CLAIMED" | "IN_PROGRESS" | "DONE",
      expectedVersion: task.version,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading board…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-red-500">
        {error?.message ?? "Room not found."}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {joinOpen && (
        <JoinModal
          roomId={roomId}
          onJoined={(id) => {
            setParticipantId(id);
            setJoinOpen(false);
            toast("Joined the room!", "success");
          }}
          onClose={() => setJoinOpen(false)}
        />
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{data.name}</h1>
          {data.description && (
            <p className="text-sm text-gray-500">{data.description}</p>
          )}
        </div>
        <PresenceStrip
          onJoin={() => setJoinOpen(true)}
          hasJoined={participantId !== null}
        />
      </header>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {COLUMNS.map(({ status, label }) => (
            <DroppableColumn
              key={status}
              status={status}
              label={label}
              isOver={overColumn === status}
            >
              {tasksByStatus(status).map((task) => (
                <TaskCard
                  key={task.id}
                  task={{ ...task, roomId }}
                  participantId={participantId}
                  onToast={handleToast}
                />
              ))}
              {tasksByStatus(status).length === 0 && status !== "UNCLAIMED" && (
                <p className="rounded-md border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                  No tasks
                </p>
              )}
              {status === "UNCLAIMED" && (
                <AddTaskForm
                  roomId={roomId}
                  onAdded={() => toast("Task added!", "success")}
                />
              )}
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="w-72 rotate-1 rounded-lg border border-gray-200 bg-white p-4 shadow-xl opacity-95">
              <p className="text-sm font-medium">{activeTask.title}</p>
              {activeTask.description && (
                <p className="mt-1 text-xs text-gray-500">{activeTask.description}</p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

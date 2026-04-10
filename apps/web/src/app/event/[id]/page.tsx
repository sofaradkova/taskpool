"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { Toaster } from "@/components/Toaster";
import { useToast } from "@/lib/useToast";
import { trpc } from "@/lib/trpc";
import { getSocket } from "@/lib/socket";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "UNCLAIMED", label: "Unclaimed" },
  { status: "CLAIMED", label: "Claimed" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "DONE", label: "Done" },
];

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

export default function EventBoardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const eventId = params.id;
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [onlineParticipants, setOnlineParticipants] = useState<{ id: string; displayName: string }[]>([]);
  const [activeTask, setActiveTask] = useState<TaskCardTask | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toasts, toast, dismiss } = useToast();
  const handleToast = useCallback(
    (message: string, variant: "success" | "error" | "info") =>
      toast(message, variant),
    [toast],
  );
  const utils = trpc.useUtils();

  useEffect(() => {
    const stored = localStorage.getItem(`taskpool:participantId:${eventId}`);
    if (stored) {
      setParticipantId(stored);
      setDisplayName(localStorage.getItem(`taskpool:displayName:${eventId}`));
    } else {
      router.replace(`/event/${eventId}/join`);
    }
  }, [eventId, router]);

  // Connect socket and join the event room
  useEffect(() => {
    if (!participantId) return;

    const socket = getSocket();
    socket.connect();
    socket.emit("join_room", { eventId, participantId });

    return () => {
      socket.disconnect();
    };
  }, [eventId, participantId]);

  // Subscribe to real-time events and patch local cache
  useEffect(() => {
    if (!participantId) return;

    const socket = getSocket();

    const patchTask = (taskId: string, patch: Record<string, unknown>) => {
      utils.event.get.setData({ eventId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
        };
      });
    };

    socket.on("task:created", ({ task }) => {
      utils.event.get.setData({ eventId }, (old) => {
        if (!old) return old;
        return { ...old, tasks: [...old.tasks, task as never] };
      });
    });

    socket.on("task:claimed", ({ taskId, participantId: claimedBy, version, leaseExpiresAt }) => {
      patchTask(taskId, { status: "CLAIMED", claimedBy, version, leaseExpiresAt });
    });

    socket.on("task:started", ({ taskId, version }) => {
      patchTask(taskId, { status: "IN_PROGRESS", version });
    });

    socket.on("task:completed", ({ taskId, version }) => {
      patchTask(taskId, { status: "DONE", version });
    });

    socket.on("task:unclaimed", ({ taskId }) => {
      patchTask(taskId, { status: "UNCLAIMED", claimedBy: null, leaseExpiresAt: null });
      // Invalidate to sync the version number we don't have in this payload
      void utils.event.get.invalidate({ eventId });
    });

    socket.on("presence:snapshot", ({ participants }) => {
      setOnlineParticipants(participants);
    });

    socket.on("participant:joined", ({ participantId: pid, displayName: name }) => {
      setOnlineParticipants((prev) =>
        prev.some((p) => p.id === pid) ? prev : [...prev, { id: pid, displayName: name }],
      );
      utils.event.get.setData({ eventId }, (old) => {
        if (!old) return old;
        if (old.participants.some((p) => p.id === pid)) return old;
        return {
          ...old,
          participants: [
            ...old.participants,
            { id: pid, displayName: name, roomId: eventId, joinedAt: new Date().toISOString() },
          ],
        };
      });
    });

    socket.on("participant:left", ({ participantId: pid }) => {
      setOnlineParticipants((prev) => prev.filter((p) => p.id !== pid));
      utils.event.get.setData({ eventId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          participants: old.participants.filter((p) => p.id !== pid),
        };
      });
    });

    return () => {
      socket.off("task:created");
      socket.off("task:claimed");
      socket.off("task:started");
      socket.off("task:completed");
      socket.off("task:unclaimed");
      socket.off("presence:snapshot");
      socket.off("participant:joined");
      socket.off("participant:left");
    };
  }, [eventId, participantId, utils]);

  const handleCopyLink = () => {
    const url = participantId
      ? `${window.location.origin}/event/${eventId}/join?invitedBy=${participantId}`
      : `${window.location.origin}/event/${eventId}/join`;
    void navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const { data, isLoading, error } = trpc.event.get.useQuery(
    { eventId },
    { retry: false },
  );

  const updateStatus = trpc.task.updateStatus.useMutation({
    onSuccess: () => {
      void utils.event.get.invalidate({ eventId });
    },
    onError: (err) => {
      void utils.event.get.invalidate({ eventId });
      toast(err.message ?? "Failed to move task.", "error");
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const participantNames = new Map(
    (data?.participants ?? []).map((p) => [p.id, p.displayName]),
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

    utils.event.get.setData({ eventId }, (old) => {
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
        {error?.message ?? "Event not found."}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Toaster toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{data.name}</h1>
          {data.description && (
            <p className="text-sm text-gray-500">{data.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50"
          >
            {linkCopied ? (
              <>
                <svg className="h-3.5 w-3.5 text-green-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="5" width="8" height="8" rx="1" strokeLinejoin="round" />
                  <path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" strokeLinecap="round" />
                </svg>
                Copy invite link
              </>
            )}
          </button>
          <PresenceStrip displayName={displayName} participants={onlineParticipants} />
        </div>
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
                  task={{
                    ...task,
                    eventId,
                    claimedByName: task.claimedBy
                      ? (participantNames.get(task.claimedBy) ?? null)
                      : null,
                  }}
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
                  eventId={eventId}
                  participantId={participantId}
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

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import type { TaskStatus, Task, Room, Participant } from "@taskpool/types";

type EventData = Room & { tasks: Task[]; participants: Participant[] };
import { TaskCard, type TaskCardTask } from "@/components/TaskCard";
import { AddTaskForm } from "@/components/AddTaskForm";
import { PresenceStrip } from "@/components/PresenceStrip";
import { Toaster } from "@/components/Toaster";
import { useToast } from "@/lib/useToast";
import { trpc } from "@/lib/trpc";
import { getSocket } from "@/lib/socket";

const COLUMNS: { status: TaskStatus; label: string; dot: string; labelColor: string }[] = [
  { status: "UNCLAIMED",   label: "Unclaimed",   dot: "bg-[#79747E]", labelColor: "text-[#49454F]" },
  { status: "CLAIMED",     label: "Claimed",     dot: "bg-[#6750A4]", labelColor: "text-[#6750A4]" },
  { status: "IN_PROGRESS", label: "In Progress", dot: "bg-[#B45309]", labelColor: "text-[#B45309]" },
  { status: "DONE",        label: "Done",        dot: "bg-[#0F766E]", labelColor: "text-[#0F766E]" },
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
  dot,
  labelColor,
  children,
  isOver,
}: {
  status: TaskStatus;
  label: string;
  dot: string;
  labelColor: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex w-full flex-col gap-3 sm:min-w-0 sm:flex-1">
      <div className="flex items-center gap-1.5 px-1">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>{label}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-col gap-2 rounded-2xl p-2 transition-colors ${
          isOver ? "bg-[#E8DEF8]/60 ring-2 ring-[#6750A4]/30" : "bg-[#F7F2FA]"
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
    (message: string, variant: "success" | "error" | "info") => toast(message, variant),
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

  useEffect(() => {
    if (!participantId) return;
    const socket = getSocket();
    socket.connect();
    socket.emit("join_room", { eventId, participantId });
    return () => { socket.disconnect(); };
  }, [eventId, participantId]);

  useEffect(() => {
    if (!participantId) return;
    const socket = getSocket();

    const patchTask = (taskId: string, patch: Record<string, unknown>) => {
      utils.event.get.setData({ eventId }, (old: EventData | undefined) => {
        if (!old) return old;
        return { ...old, tasks: old.tasks.map((t: Task) => (t.id === taskId ? { ...t, ...patch } : t)) };
      });
    };

    socket.on("task:created", ({ task }) => {
      utils.event.get.setData({ eventId }, (old: EventData | undefined) => {
        if (!old) return old;
        return { ...old, tasks: [...old.tasks, task as Task] };
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
      void utils.event.get.invalidate({ eventId });
    });
    socket.on("presence:snapshot", ({ participants }) => {
      setOnlineParticipants(participants);
    });
    socket.on("participant:joined", ({ participantId: pid, displayName: name }) => {
      setOnlineParticipants((prev) =>
        prev.some((p) => p.id === pid) ? prev : [...prev, { id: pid, displayName: name }],
      );
      utils.event.get.setData({ eventId }, (old: EventData | undefined) => {
        if (!old) return old;
        if (old.participants.some((p: Participant) => p.id === pid)) return old;
        return {
          ...old,
          participants: [...old.participants, { id: pid, displayName: name, roomId: eventId, joinedAt: new Date() }],
        };
      });
    });
    socket.on("participant:left", ({ participantId: pid }) => {
      setOnlineParticipants((prev) => prev.filter((p) => p.id !== pid));
      utils.event.get.setData({ eventId }, (old: EventData | undefined) => {
        if (!old) return old;
        return { ...old, participants: old.participants.filter((p: Participant) => p.id !== pid) };
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

  const { data, isLoading, error } = trpc.event.get.useQuery({ eventId }, { retry: false });

  const updateStatus = trpc.task.updateStatus.useMutation({
    onSuccess: () => { void utils.event.get.invalidate({ eventId }); },
    onError: (err) => {
      void utils.event.get.invalidate({ eventId });
      toast(err.message ?? "Failed to move task.", "error");
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const participantNames = new Map<string, string>((data?.participants ?? []).map((p: Participant) => [p.id, p.displayName]));
  const tasksByStatus = (status: TaskStatus) => (data?.tasks ?? []).filter((t: Task) => t.status === status);

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
    utils.event.get.setData({ eventId }, (old: EventData | undefined) => {
      if (!old) return old;
      return { ...old, tasks: old.tasks.map((t: Task) => t.id === task.id ? { ...t, status: targetStatus } : t) };
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
      <div className="flex min-h-screen items-center justify-center bg-[#FFFBFE] text-sm text-[#79747E]">
        Loading board…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFBFE] text-sm text-red-500">
        {error?.message ?? "Event not found."}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFBFE]">
      <Toaster toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#ECE6F0] px-3 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6750A4]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white" />
                <rect x="9" y="2" width="5" height="5" rx="1.5" fill="white" opacity=".7" />
                <rect x="2" y="9" width="5" height="5" rx="1.5" fill="white" opacity=".7" />
                <rect x="9" y="9" width="5" height="5" rx="1.5" fill="white" opacity=".4" />
              </svg>
            </div>
          </Link>
          <div className="h-4 w-px shrink-0 bg-[#ECE6F0]" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-[#1C1B1F]">{data.name}</h1>
            {data.description && (
              <p className="hidden truncate text-xs text-[#79747E] sm:block">{data.description}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium text-[#49454F] transition-colors hover:bg-[#F3EDF7] sm:px-3.5"
          >
            {linkCopied ? (
              <>
                <svg className="h-3.5 w-3.5 text-[#0F766E]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[#0F766E]">Copied!</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="5" width="8" height="8" rx="1" strokeLinejoin="round" />
                  <path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" strokeLinecap="round" />
                </svg>
                Invite
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
        <div className="flex flex-1 flex-col gap-4 p-3 sm:flex-row sm:p-6">
          {COLUMNS.map(({ status, label, dot, labelColor }) => (
            <DroppableColumn
              key={status}
              status={status}
              label={label}
              dot={dot}
              labelColor={labelColor}
              isOver={overColumn === status}
            >
              {tasksByStatus(status).map((task: Task) => (
                <TaskCard
                  key={task.id}
                  task={{
                    ...task,
                    eventId,
                    claimedByName: task.claimedBy ? (participantNames.get(task.claimedBy) ?? null) : null,
                  }}
                  participantId={participantId}
                  onToast={handleToast}
                />
              ))}
              {tasksByStatus(status).length === 0 && status !== "UNCLAIMED" && (
                <p className="rounded-2xl border border-dashed border-[#CAC4D0] py-6 text-center text-xs text-[#79747E]">
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
            <div className="rotate-1 rounded-2xl border border-[#ECE6F0] bg-white p-4 shadow-xl opacity-95">
              <p className="text-sm font-semibold text-[#1C1B1F]">{activeTask.title}</p>
              {activeTask.description && (
                <p className="mt-1 text-xs text-[#79747E]">{activeTask.description}</p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

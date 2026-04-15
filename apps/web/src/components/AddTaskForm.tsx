"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface AddTaskFormProps {
  eventId: string;
  participantId: string | null;
  onAdded: () => void;
}

export function AddTaskForm({ eventId, participantId, onAdded }: AddTaskFormProps) {
  if (!participantId) return null;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const utils = trpc.useUtils();

  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setOpen(false);
      onAdded();
      void utils.event.get.invalidate({ eventId });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTask.mutate({
      eventId,
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setOpen(false);
  };

  const inputClass =
    "w-full rounded-xl border border-[#CAC4D0] bg-white px-3 py-2 text-sm text-[#1C1B1F] outline-none placeholder:text-[#79747E] focus:border-[#6750A4] focus:ring-2 focus:ring-[#6750A4]/20 transition-all";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-2xl border border-dashed border-[#CAC4D0] px-3 py-2.5 text-xs text-[#79747E] hover:border-[#6750A4] hover:text-[#6750A4] transition-colors"
      >
        <span className="text-sm leading-none">+</span> Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-2xl border border-[#ECE6F0] bg-white p-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        required
        autoFocus
        className={inputClass}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className={`${inputClass} resize-none`}
      />
      {createTask.error && (
        <p className="text-xs text-red-500">{createTask.error.message}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createTask.isPending || !title.trim()}
          className="flex-1 rounded-full bg-[#6750A4] py-1.5 text-xs font-semibold text-white hover:bg-[#5B4397] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {createTask.isPending ? "Adding…" : "Add task"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium text-[#49454F] hover:bg-[#F3EDF7] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

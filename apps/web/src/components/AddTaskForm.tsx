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
    onSuccess: async () => {
      await utils.event.get.invalidate({ eventId });
      setTitle("");
      setDescription("");
      setOpen(false);
      onAdded();
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-600"
      >
        <span className="text-sm leading-none">+</span> Add task
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        required
        autoFocus
        className="rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="resize-none rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black focus:ring-1 focus:ring-black"
      />
      {createTask.error && (
        <p className="text-xs text-red-500">{createTask.error.message}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createTask.isPending || !title.trim()}
          className="flex-1 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createTask.isPending ? "Adding…" : "Add task"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

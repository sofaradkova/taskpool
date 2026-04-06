"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/lib/useToast";
import { Toaster } from "@/components/Toaster";

export default function NewRoomPage() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const createRoom = trpc.room.create.useMutation({
    onSuccess: (room) => {
      router.push(`/room/${room.id}`);
    },
    onError: (err) => {
      toast(err.message ?? "Failed to create room", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRoom.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Create a room</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up a shared board for your group event.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Room name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apartment move — June 14"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — what is this event about?"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="expires" className="text-sm font-medium">
              Expires at
            </label>
            <input
              id="expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
            <p className="text-xs text-gray-400">Leave blank for no expiry.</p>
          </div>

          <button
            type="submit"
            disabled={createRoom.isPending || !name.trim()}
            className="mt-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createRoom.isPending ? "Creating…" : "Create room"}
          </button>
        </form>
      </div>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}

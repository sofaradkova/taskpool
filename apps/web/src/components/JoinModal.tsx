"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface JoinModalProps {
  eventId: string;
  onJoined: (participantId: string, displayName: string) => void;
  onClose: () => void;
}

export function JoinModal({ eventId, onJoined, onClose }: JoinModalProps) {
  const [displayName, setDisplayName] = useState("");

  const join = trpc.participant.join.useMutation({
    onSuccess: (participant) => {
      localStorage.setItem(`taskpool:participantId:${eventId}`, participant.id);
      localStorage.setItem(`taskpool:displayName:${eventId}`, participant.displayName);
      onJoined(participant.id, participant.displayName);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    join.mutate({ eventId, displayName: displayName.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Join this event</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose a display name that others on the board will see.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="displayName" className="text-sm font-medium">
              Display name <span className="text-red-500">*</span>
            </label>
            <input
              id="displayName"
              type="text"
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alice"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {join.error && (
            <p className="text-xs text-red-500">{join.error.message}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={join.isPending || !displayName.trim()}
              className="flex-1 rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {join.isPending ? "Joining…" : "Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

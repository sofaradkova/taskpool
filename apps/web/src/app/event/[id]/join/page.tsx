"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function JoinPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.id;
  const invitedById = searchParams.get("invitedBy");
  const [displayName, setDisplayName] = useState("");

  // Already joined? Go straight to the board.
  useEffect(() => {
    const stored = localStorage.getItem(`taskpool:participantId:${eventId}`);
    if (stored) router.replace(`/event/${eventId}`);
  }, [eventId, router]);

  const { data: event, isLoading: eventLoading } = trpc.event.get.useQuery(
    { eventId },
    { retry: false },
  );

  const join = trpc.participant.join.useMutation({
    onSuccess: (participant) => {
      localStorage.setItem(`taskpool:participantId:${eventId}`, participant.id);
      localStorage.setItem(`taskpool:displayName:${eventId}`, participant.displayName);
      router.push(`/event/${eventId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    join.mutate({ eventId, displayName: displayName.trim() });
  };

  if (eventLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-red-500">
        Event not found.
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {invitedById && (() => {
            const inviter = event.participants.find((p) => p.id === invitedById);
            return inviter ? (
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-medium text-gray-800">{inviter.displayName}</span>
                {" is inviting you to join"}
              </p>
            ) : null;
          })()}
          <h1 className="text-2xl font-bold">{event.name}</h1>
          {event.description && (
            <p className="mt-1 text-sm text-gray-500">{event.description}</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Join this event</h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose a display name that others on the board will see.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="displayName" className="text-sm font-medium">
                Your name <span className="text-red-500">*</span>
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

            <button
              type="submit"
              disabled={join.isPending || !displayName.trim()}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {join.isPending ? "Joining…" : "Join event"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

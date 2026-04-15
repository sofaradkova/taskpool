"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/lib/useToast";
import { Toaster } from "@/components/Toaster";

export default function NewEventPage() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();

  const [name, setName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [description, setDescription] = useState("");
const createEvent = trpc.event.create.useMutation({
    onSuccess: ({ event, participantId, token }) => {
      localStorage.setItem(`taskpool:participantId:${event.id}`, participantId);
      localStorage.setItem(`taskpool:displayName:${event.id}`, creatorName.trim());
      localStorage.setItem(`taskpool:token:${event.id}`, token);
      router.push(`/event/${event.id}`);
    },
    onError: (err) => {
      toast(err.message ?? "Failed to create event", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEvent.mutate({
      name: name.trim(),
      creatorName: creatorName.trim(),
      description: description.trim() || undefined,
    });
  };

  const inputClass =
    "w-full rounded-2xl border border-[#CAC4D0] bg-white px-4 py-3 text-sm text-[#1C1B1F] outline-none placeholder:text-[#79747E] focus:border-[#6750A4] focus:ring-2 focus:ring-[#6750A4]/20 transition-all";

  return (
    <main className="min-h-screen bg-[#FFFBFE]">
      {/* Nav */}
      <nav className="flex items-center border-b border-[#ECE6F0] px-8 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6750A4]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1.5" fill="white" opacity=".7" />
              <rect x="2" y="9" width="5" height="5" rx="1.5" fill="white" opacity=".7" />
              <rect x="9" y="9" width="5" height="5" rx="1.5" fill="white" opacity=".4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#1C1B1F] tracking-tight">Taskpool</span>
        </Link>
      </nav>

      {/* Form */}
      <div className="mx-auto flex w-full max-w-lg flex-col px-8 pt-16 pb-24">
        <h1 className="text-3xl font-bold text-[#1C1B1F]">Create an event</h1>
        <p className="mt-2 text-sm text-[#49454F]">
          Set up a shared board for your group. Share the link and coordinate in real time.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-[#49454F]">
              Event name <span className="text-[#6750A4]">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apartment move — June 14"
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="creatorName" className="text-xs font-semibold uppercase tracking-wide text-[#49454F]">
              Your name <span className="text-[#6750A4]">*</span>
            </label>
            <input
              id="creatorName"
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g. Alice"
              required
              className={inputClass}
            />
            <p className="text-xs text-[#79747E]">This is what others on the board will see.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wide text-[#49454F]">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — what is this event about?"
              className={inputClass}
            />
          </div>


          <button
            type="submit"
            disabled={createEvent.isPending || !name.trim() || !creatorName.trim()}
            className="mt-2 rounded-full bg-[#6750A4] py-3.5 text-sm font-semibold text-white hover:bg-[#5B4397] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {createEvent.isPending ? "Creating…" : "Create event"}
          </button>
        </form>
      </div>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}

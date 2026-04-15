import Link from "next/link";

const MOCK_TASKS = [
  { id: "1", col: "UNCLAIMED",   title: "Pick up folding tables",  assignee: null },
  { id: "2", col: "UNCLAIMED",   title: "Buy paper plates & cups", assignee: null },
  { id: "3", col: "CLAIMED",     title: "Set up tent in backyard", assignee: "Maya" },
  { id: "4", col: "IN_PROGRESS", title: "Hang string lights",      assignee: "Jordan" },
  { id: "5", col: "DONE",        title: "Send calendar invites",   assignee: "Alex" },
];

const COL_META: Record<string, { label: string; dot: string; labelColor: string }> = {
  UNCLAIMED:   { label: "Unclaimed",   dot: "bg-[#79747E]", labelColor: "text-[#49454F]" },
  CLAIMED:     { label: "Claimed",     dot: "bg-[#6750A4]", labelColor: "text-[#6750A4]" },
  IN_PROGRESS: { label: "In Progress", dot: "bg-[#B45309]", labelColor: "text-[#B45309]" },
  DONE:        { label: "Done",        dot: "bg-[#0F766E]", labelColor: "text-[#0F766E]" },
};

function MockTaskCard({ title, assignee, status }: { title: string; assignee: string | null; status: string }) {
  const m = COL_META[status] ?? COL_META["UNCLAIMED"]!;
  return (
    <div className="rounded-2xl border border-[#ECE6F0] bg-white px-3.5 py-3">
      <p className="text-[11px] font-semibold text-[#1C1B1F] leading-snug">{title}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
        <span className="text-[10px] text-[#79747E]">{assignee ?? "Unclaimed"}</span>
      </div>
    </div>
  );
}

function MockBoard() {
  const cols = ["UNCLAIMED", "CLAIMED", "IN_PROGRESS", "DONE"];
  return (
    <div className="pointer-events-none flex gap-3 overflow-hidden rounded-3xl border border-[#ECE6F0] bg-[#F7F2FA] p-4">
      {cols.map((col) => {
        const tasks = MOCK_TASKS.filter((t) => t.col === col);
        const m = COL_META[col]!;
        return (
          <div key={col} className="flex w-40 flex-shrink-0 flex-col gap-2.5">
            <div className="flex items-center gap-1.5 px-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${m.labelColor}`}>
                {m.label}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {tasks.map((t) => (
                <MockTaskCard key={t.id} title={t.title} assignee={t.assignee} status={t.col} />
              ))}
              {tasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#CAC4D0] py-5 text-center text-[10px] text-[#79747E]">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STEPS = [
  { number: "01", title: "Create an event",    description: "Name your event — a move, party, volunteer day, anything that needs hands." },
  { number: "02", title: "Invite your team",   description: "Share one link. Each person picks a display name and lands straight on the board." },
  { number: "03", title: "Claim & coordinate", description: "Everyone grabs tasks in real time. No spreadsheet, no double-booking, no confusion." },
];

const USE_CASES = [
  { label: "Apartment moves",  description: "Divide packing, hauling, and setup between roommates without stepping on each other." },
  { label: "House parties",    description: "Split shopping, cooking, and decorating so the host isn't doing everything alone." },
  { label: "Volunteer events", description: "Coordinate a crew of helpers on the day without a walkie-talkie." },
];

const AVATARS = ["Maya", "Jordan", "Alex", "Sam"];
const AVATAR_BG = ["bg-[#6750A4]", "bg-[#625B71]", "bg-[#0F766E]", "bg-[#B45309]"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FFFBFE]">

      {/* Nav */}
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ECE6F0] bg-[#FFFBFE]/90 px-8 py-3.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6750A4]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1.5" fill="white" opacity=".7" />
              <rect x="2" y="9" width="5" height="5" rx="1.5" fill="white" opacity=".7" />
              <rect x="9" y="9" width="5" height="5" rx="1.5" fill="white" opacity=".4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#1C1B1F] tracking-tight">Taskpool</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-8 pt-20 pb-10 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-[#1C1B1F] sm:text-6xl leading-tight">
          Group events,{" "}
          <span className="text-[#6750A4]">zero chaos</span>
        </h1>
        <p className="mt-5 max-w-lg text-base text-[#49454F] leading-relaxed">
          A live task board for groups. Everyone claims what they&apos;ll do,
          work moves in real time, and nothing falls through the cracks.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/event/new"
            className="rounded-full bg-[#6750A4] px-7 py-3 text-sm font-semibold text-white hover:bg-[#5B4397] transition-colors"
          >
            Create a free event
          </Link>
        </div>
        <div className="mt-8 flex items-center gap-2">
          <div className="flex -space-x-2">
            {AVATARS.map((name, i) => (
              <div key={name} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#FFFBFE] text-[10px] font-bold text-white ${AVATAR_BG[i]}`}>
                {name[0]}
              </div>
            ))}
          </div>
          <span className="text-xs text-[#79747E]">4 people coordinating right now</span>
        </div>
      </section>

      {/* Board preview */}
      <section className="mx-auto w-full max-w-4xl px-8 pb-20">
        <div className="overflow-x-auto">
          <MockBoard />
        </div>
        <p className="mt-3 text-center text-xs text-[#79747E]">
          Live board — task updates appear instantly for everyone in the room
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-[#ECE6F0] bg-[#F7F2FA] px-8 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-[#1C1B1F]">How it works</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="rounded-3xl border border-[#ECE6F0] bg-white p-6">
                <span className="text-2xl font-bold text-[#6750A4]">{step.number}</span>
                <h3 className="mt-3 font-semibold text-[#1C1B1F]">{step.title}</h3>
                <p className="mt-1.5 text-sm text-[#49454F] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="px-8 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-[#1C1B1F]">Built for real events</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {USE_CASES.map((uc) => (
              <div key={uc.label} className="rounded-3xl border border-[#ECE6F0] p-6">
                <h3 className="mb-2 font-semibold text-[#1C1B1F]">{uc.label}</h3>
                <p className="text-sm text-[#49454F] leading-relaxed">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="border-t border-[#ECE6F0] px-8 py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold text-[#1C1B1F]">Ready to coordinate?</h2>
        <p className="mb-7 text-sm text-[#49454F]">No account needed. Create an event and share the link.</p>
        <Link
          href="/event/new"
          className="inline-block rounded-full bg-[#6750A4] px-10 py-3.5 text-sm font-semibold text-white hover:bg-[#5B4397] transition-colors"
        >
          Create an event
        </Link>
      </section>

    </main>
  );
}

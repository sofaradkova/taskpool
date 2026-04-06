const SAMPLE_PARTICIPANTS = [
  { id: "participant-alice", displayName: "Alice" },
  { id: "participant-bob", displayName: "Bob" },
  { id: "participant-carol", displayName: "Carol" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Stable color per participant based on their id
const AVATAR_COLORS = [
  "bg-violet-200 text-violet-800",
  "bg-sky-200 text-sky-800",
  "bg-emerald-200 text-emerald-800",
  "bg-amber-200 text-amber-800",
  "bg-rose-200 text-rose-800",
];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

interface PresenceStripProps {
  onJoin: () => void;
  hasJoined?: boolean;
}

export function PresenceStrip({ onJoin, hasJoined = false }: PresenceStripProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Avatars */}
      <div className="flex -space-x-2">
        {SAMPLE_PARTICIPANTS.map((p) => (
          <div
            key={p.id}
            title={p.displayName}
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold ${colorFor(p.id)}`}
          >
            {initials(p.displayName)}
          </div>
        ))}
      </div>

      <span className="text-xs text-gray-400">
        {SAMPLE_PARTICIPANTS.length} online
      </span>

      {!hasJoined && (
        <button
          onClick={onJoin}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
        >
          Join
        </button>
      )}
    </div>
  );
}

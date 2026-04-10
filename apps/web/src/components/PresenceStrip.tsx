function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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
  displayName: string | null;
  participants: { id: string; displayName: string }[];
}

export function PresenceStrip({ displayName, participants }: PresenceStripProps) {
  return (
    <div className="flex items-center gap-3">
      {participants.length > 0 && (
        <div className="flex -space-x-2">
          {participants.map((p) => (
            <div key={p.id} className="group relative">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold ${colorFor(p.id)}`}
              >
                {initials(p.displayName)}
              </div>
              <div className="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {p.displayName}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
              </div>
            </div>
          ))}
        </div>
      )}

      {displayName && (
        <span className="text-sm font-medium text-gray-700">{displayName}</span>
      )}
    </div>
  );
}

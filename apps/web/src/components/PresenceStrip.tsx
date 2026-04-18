function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-[#6750A4] text-white",
  "bg-[#625B71] text-white",
  "bg-[#0F766E] text-white",
  "bg-[#B45309] text-white",
  "bg-[#7D5260] text-white",
];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

interface PresenceStripProps {
  displayName: string | null;
  participants: { id: string; displayName: string }[];
}

export function PresenceStrip({ displayName, participants }: PresenceStripProps) {
  return (
    <div className="flex items-center gap-2">
      {participants.length > 0 && (
        <div className="flex -space-x-2">
          {participants.map((p) => (
            <div key={p.id} className="group relative">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#FFFBFE] text-[10px] font-bold ${colorFor(p.id)}`}>
                {initials(p.displayName)}
              </div>
              <div className="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#1C1B1F] px-2.5 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {p.displayName}
              </div>
            </div>
          ))}
        </div>
      )}
      {displayName && (
        <span className="hidden text-xs font-medium text-[#49454F] sm:inline">{displayName}</span>
      )}
    </div>
  );
}

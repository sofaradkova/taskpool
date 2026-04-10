// Shared domain types and Socket.io event interfaces

export type TaskStatus = "UNCLAIMED" | "CLAIMED" | "IN_PROGRESS" | "DONE";

export interface Task {
  id: string;
  roomId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  version: number;
  claimedBy: string | null;
  leaseExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface Participant {
  id: string;
  roomId: string;
  displayName: string;
  joinedAt: Date;
}

// Socket.io typed event maps

export interface ServerToClientEvents {
  "task:claimed": (payload: {
    taskId: string;
    participantId: string;
    version: number;
    leaseExpiresAt: Date;
  }) => void;
  "task:started": (payload: {
    taskId: string;
    participantId: string;
    version: number;
  }) => void;
  "task:completed": (payload: {
    taskId: string;
    participantId: string;
    version: number;
  }) => void;
  "task:unclaimed": (payload: {
    taskId: string;
    reason: "lease_expired" | "manual";
  }) => void;
  "task:created": (payload: { task: Task }) => void;
  "participant:joined": (payload: {
    participantId: string;
    displayName: string;
  }) => void;
  "participant:left": (payload: { participantId: string }) => void;
  "presence:snapshot": (payload: {
    participants: Pick<Participant, "id" | "displayName">[];
  }) => void;
}

export interface ClientToServerEvents {
  join_room: (payload: { eventId: string; participantId: string }) => void;
  heartbeat: () => void;
}

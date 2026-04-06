import { router } from "../trpc.js";
import { participantRouter } from "./participant.js";
import { roomRouter } from "./room.js";
import { taskRouter } from "./task.js";

export const appRouter = router({
  room: roomRouter,
  participant: participantRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;

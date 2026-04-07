import { router } from "../trpc.js";
import { eventRouter } from "./event.js";
import { participantRouter } from "./participant.js";
import { taskRouter } from "./task.js";

export const appRouter = router({
  event: eventRouter,
  participant: participantRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;

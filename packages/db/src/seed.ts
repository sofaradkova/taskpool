import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const room = await prisma.room.create({
    data: {
      name: "Apartment move — June 14",
      description: "Coordinating the big move to the new place.",
      participants: {
        create: [
          { displayName: "Alice" },
          { displayName: "Bob" },
          { displayName: "Carol" },
        ],
      },
    },
    include: { participants: true },
  });

  const [alice, bob] = room.participants;

  if (!alice || !bob) throw new Error("Participants not created");

  await prisma.$transaction([
    prisma.task.create({
      data: {
        roomId: room.id,
        title: "Rent the moving truck",
        description: "Need a 16ft truck from U-Haul on June 14.",
        status: "UNCLAIMED",
      },
    }),
    prisma.task.create({
      data: {
        roomId: room.id,
        title: "Pack the kitchen",
        status: "UNCLAIMED",
      },
    }),
    prisma.task.create({
      data: {
        roomId: room.id,
        title: "Confirm elevator booking",
        description: "Building requires 48h notice.",
        status: "UNCLAIMED",
      },
    }),
    prisma.eventLog.create({
      data: {
        roomId: room.id,
        eventType: "PARTICIPANT_JOINED",
        participantId: alice.id,
        payload: { displayName: alice.displayName },
      },
    }),
    prisma.eventLog.create({
      data: {
        roomId: room.id,
        eventType: "PARTICIPANT_JOINED",
        participantId: bob.id,
        payload: { displayName: bob.displayName },
      },
    }),
  ]);

  console.log(`Seeded room: ${room.id} — "${room.name}"`);
  console.log(`Participants: ${room.participants.map((p) => p.displayName).join(", ")}`);
  console.log("Tasks: Rent the moving truck, Pack the kitchen, Confirm elevator booking");
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

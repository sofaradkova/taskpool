import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Taskpool</h1>
      <p className="mt-2 text-gray-500">Real-time collaborative task coordination</p>
      <Link
        href="/room/new"
        className="mt-8 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Create a room
      </Link>
    </main>
  );
}

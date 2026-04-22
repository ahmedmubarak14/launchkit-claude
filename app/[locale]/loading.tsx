export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border hairline" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-ink animate-spin" />
      </div>
    </main>
  );
}

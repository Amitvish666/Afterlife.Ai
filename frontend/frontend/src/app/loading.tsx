export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center space-y-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-surface-800 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-beyond-purple rounded-full border-t-transparent animate-spin absolute inset-0"></div>
        <div className="w-16 h-16 border-4 border-beyond-pink rounded-full border-r-transparent animate-[spin_1.5s_linear_infinite] absolute inset-0"></div>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <h2 className="text-xl font-bold text-white tracking-widest uppercase">
          Neural Link Syncing
        </h2>
        <p className="text-sm font-medium text-surface-500 uppercase tracking-[0.2em] animate-pulse">
          Establishing Secure Connection...
        </p>
      </div>
    </div>
  );
}

export function LoadoutLogo({ className = "" }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-300 flex items-center justify-center shadow-[0_0_18px_rgba(99,102,241,0.24)] shrink-0">
        <div className="w-6 h-6 border-2 border-white/85 rotate-45 rounded-sm"></div>
      </div>

      <div className="leading-tight">
        <div className="text-white text-xl font-bold tracking-wide">
          LOADOUT
        </div>
        <div className="text-xs uppercase tracking-[0.22em] text-indigo-200/80">
          Field Parts Tracking
        </div>
      </div>
    </div>
  );
}

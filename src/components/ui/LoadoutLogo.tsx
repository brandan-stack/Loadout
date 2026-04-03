export function LoadoutLogo({ className = "" }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.38)] shrink-0">
        <div className="w-6 h-6 border-2 border-white/85 rotate-45 rounded-sm"></div>
      </div>

      <div className="leading-tight">
        <div className="text-white text-xl font-bold tracking-wide">
          LOADOUT
        </div>
        <div className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">
          Field Parts Tracking
        </div>
      </div>
    </div>
  );
}

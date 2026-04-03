export function LoadoutLogo({ className = "" }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.35)]">
        <div className="w-5 h-5 border-2 border-white/80 rotate-45 rounded-sm"></div>
      </div>

      <div className="leading-tight">
        <div className="text-white text-lg font-semibold tracking-wide">
          LOADOUT
        </div>
        <div className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">
          Field Parts Tracking
        </div>
      </div>
    </div>
  );
}

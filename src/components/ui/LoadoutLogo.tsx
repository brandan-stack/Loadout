export function LoadoutLogo({ className = "" }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <img
        src="/loadout-logo.svg?v=4"
        alt="Loadout logo"
        className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]"
      />
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

export function AuthLogo() {
  return (
    <div className="flex items-center justify-center gap-3 mb-2">
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
          boxShadow: "0 0 18px rgba(99,102,241,0.35)",
        }}
      >
        <div className="w-5 h-5 border-2 border-white/85 rotate-45 rounded-[3px]" />
      </div>
      <div className="leading-none">
        <div
          className="text-white font-bold"
          style={{ fontSize: "20px", letterSpacing: "0.12em" }}
        >
          LOADOUT
        </div>
        <div
          className="text-slate-500 font-medium uppercase"
          style={{ fontSize: "9px", letterSpacing: "0.18em", marginTop: "2px" }}
        >
          Field Parts Tracking
        </div>
      </div>
    </div>
  );
}

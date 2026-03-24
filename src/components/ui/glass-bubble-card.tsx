// src/components/ui/glass-bubble-card.tsx - Reusable glass-morphism card

interface GlassBubbleCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassBubbleCard({
  children,
  className = "",
  onClick,
}: GlassBubbleCardProps) {
  return (
    <div
      onClick={onClick}
      className={`glass-bubble p-4 cursor-pointer transition-all hover:shadow-xl ${className}`}
    >
      {children}
    </div>
  );
}

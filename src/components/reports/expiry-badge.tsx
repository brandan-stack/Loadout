"use client";

interface ExpiryBadgeProps {
  daysLeft: number | null;
}

export function ExpiryBadge({ daysLeft }: ExpiryBadgeProps) {
  if (daysLeft === null) return null;

  if (daysLeft <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        Expired
      </span>
    );
  }

  if (daysLeft <= 7) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
        Expires in {daysLeft}d
      </span>
    );
  }

  if (daysLeft <= 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
        Expires in {daysLeft}d
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
      {daysLeft}d left
    </span>
  );
}

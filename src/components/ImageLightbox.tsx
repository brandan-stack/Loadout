import { useEffect } from "react";

type Props = {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
};

export default function ImageLightbox({ open, src, alt = "Image preview", onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div className="imageViewerOverlay" onMouseDown={onClose}>
      <div className="imageViewerCard" role="dialog" aria-modal="true" aria-label="Image preview" onMouseDown={(e) => e.stopPropagation()}>
        <button className="imageViewerClose" onClick={onClose} aria-label="Close image preview" title="Close">
          ✕
        </button>
        <img className="imageViewerImg" src={src} alt={alt} />
      </div>
    </div>
  );
}

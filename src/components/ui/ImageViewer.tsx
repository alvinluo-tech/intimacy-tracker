"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, Lock } from "lucide-react";

type ImageViewerProps = {
  images: { url: string; isPrivate?: boolean }[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
};

export function ImageViewer({ images, initialIndex = 0, open, onOpenChange }: ImageViewerProps) {
  const t = useTranslations("imageViewer");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) setCurrentIndex(initialIndex);
  }, [open, initialIndex]);

  const safeIndex = Math.min(currentIndex, images.length - 1);
  const currentImage = images[safeIndex];
  if (!currentImage) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center focus:outline-none">
          <Dialog.Title className="sr-only">{t("viewImage")}</Dialog.Title>

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70">
              <X size={18} />
            </button>
          </Dialog.Close>

          {images.length > 1 && safeIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((i) => i - 1);
              }}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70 max-md:hidden"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {images.length > 1 && safeIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((i) => i + 1);
              }}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70 max-md:hidden"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <ZoomableImage
            key={safeIndex}
            url={currentImage.url}
            images={images}
            safeIndex={safeIndex}
            setCurrentIndex={setCurrentIndex}
          />

          {currentImage.isPrivate && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5">
              <Lock size={12} className="text-white" />
              <span className="text-[11px] text-white">Private</span>
            </div>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1.5 text-[12px] text-white">
              {safeIndex + 1} / {images.length}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ZoomableImage({
  url,
  images,
  safeIndex,
  setCurrentIndex,
}: {
  url: string;
  images: { url: string; isPrivate?: boolean }[];
  safeIndex: number;
  setCurrentIndex: (fn: (i: number) => number) => void;
}) {
  const touchStartX = useRef(0);
  const touchOffset = useRef(0);
  const lastPinchDist = useRef(0);
  const lastTapTime = useRef(0);
  const [translateX, setTranslateX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [scale, setScale] = useState(1);
  const [pinching, setPinching] = useState(false);

  const isZoomed = scale > 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
      setPinching(true);
      return;
    }
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      setSwiping(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinching) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist / lastPinchDist.current;
      lastPinchDist.current = dist;
      setScale((prev) => Math.max(1, Math.min(5, prev * delta)));
      return;
    }
    if (e.touches.length === 1 && swiping && !isZoomed) {
      const dx = e.touches[0].clientX - touchStartX.current;
      touchOffset.current = dx;
      setTranslateX(dx);
    }
  };

  const handleTouchEnd = () => {
    setPinching(false);
    if (swiping && !isZoomed) {
      setSwiping(false);
      const threshold = 50;
      const dx = touchOffset.current;
      if (dx > threshold && safeIndex > 0) {
        setCurrentIndex((i) => i - 1);
      } else if (dx < -threshold && safeIndex < images.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
      touchOffset.current = 0;
      setTranslateX(0);
    }
  };

  const handleClick = () => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      setScale((prev) => (prev > 1 ? 1 : 2.5));
    }
    lastTapTime.current = now;
  };

  const wheelRef = useRef(0);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    wheelRef.current += e.deltaY;
    if (Math.abs(wheelRef.current) >= 30) {
      const dir = wheelRef.current > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.max(1, Math.min(5, prev + dir)));
      wheelRef.current = 0;
    }
  };

  return (
    <div
      className="flex items-center justify-center w-full h-full select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onWheel={handleWheel}
    >
      <img
        src={url}
        alt=""
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        draggable={false}
        style={{
          transform: pinching
            ? `scale(${scale})`
            : swiping
              ? `translateX(${translateX}px) scale(${1 - Math.abs(translateX) / 2000})`
              : `scale(${scale})`,
          transition: pinching || swiping ? "none" : "transform 0.2s ease-out",
          cursor: scale > 1 ? "grab" : "zoom-in",
        }}
      />
    </div>
  );
}

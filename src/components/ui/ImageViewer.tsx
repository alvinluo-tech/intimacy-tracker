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

          <SwipeableImage
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

function SwipeableImage({
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
  const [translateX, setTranslateX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    touchOffset.current = dx;
    setTranslateX(dx);
  };

  const handleTouchEnd = () => {
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
  };

  return (
    <div
      className="flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={url}
        alt=""
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain select-none"
        draggable={false}
        style={{
          transform: swiping ? `translateX(${translateX}px) scale(${1 - Math.abs(translateX) / 2000})` : "translateX(0px)",
          transition: swiping ? "none" : "transform 0.25s ease-out",
        }}
      />
    </div>
  );
}

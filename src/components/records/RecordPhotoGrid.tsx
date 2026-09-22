"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { ImageViewer } from "@/components/ui/ImageViewer";
import type { EncounterPhoto } from "@/features/records/types";

/**
 * Photo grid for the record detail page — same interaction as the detail
 * drawer (tap to open the viewer, lock badge on private photos), as a client
 * island so the detail page itself can stay a server component.
 */
export function RecordPhotoGrid({ photos }: { photos: EncounterPhoto[] }) {
  const t = useTranslations("encounter");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        <p className="text-[11px] font-light uppercase tracking-wider text-muted">
          {t("photos")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div key={`${photo.url}-${idx}`} className="relative aspect-square">
              <button
                type="button"
                onClick={() => {
                  setIndex(idx);
                  setOpen(true);
                }}
                className="h-full w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Photo"
                  className="h-full w-full rounded-lg object-cover"
                />
                {photo.isPrivate && (
                  <div className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
                    <Lock size={10} className="text-white" />
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
      <ImageViewer images={photos} initialIndex={index} open={open} onOpenChange={setOpen} />
    </>
  );
}

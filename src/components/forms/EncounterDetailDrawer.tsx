"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Edit2,
  Lock,
  MapPin,
  Smile,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import type { Partner, Tag, EncounterListItem } from "@/features/records/types";
import { deleteEncounterAction } from "@/features/records/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { QuickLogDrawerForm } from "./QuickLogDrawerForm";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { AvatarViewer } from "@/components/ui/AvatarViewer";
import { formatDuration } from "@/lib/utils/formatDuration";
import { formatDateInTimezone } from "@/lib/utils/formatDateInTimezone";

const MOOD_EMOJIS = ["😞", "😐", "🙂", "😊", "🥰"];
const MOOD_LABELS = ["Very Sad", "Neutral", "Happy", "Very Happy", "Love"];

function getMoodEmoji(mood: string | null): string {
  if (!mood) return "";
  const idx = MOOD_LABELS.indexOf(mood);
  return idx >= 0 ? MOOD_EMOJIS[idx] : "";
}

type EncounterDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  encounterId?: string;
  initialData?: EncounterListItem;
  partners: Partner[];
  tags: Tag[];
  startInEdit?: boolean;
};

export function EncounterDetailDrawer({
  open,
  onClose,
  encounterId,
  initialData,
  partners,
  tags,
  startInEdit,
}: EncounterDetailDrawerProps) {
  const router = useRouter();
  const t = useTranslations("encounter");
  const tc = useTranslations("common");
  const [isEditing, setIsEditing] = React.useState(false);
  const startInEditConsumed = React.useRef(false);
  const [pending, startTransition] = React.useTransition();
  const [notes, setNotes] = React.useState<string | null>(null);
  const [photos, setPhotos] = React.useState<Array<{ url: string; isPrivate: boolean }>>([]);
  const [photoViewerOpen, setPhotoViewerOpen] = React.useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = React.useState(0);

  // Enter edit mode on request (from location picker return) — one-shot per encounter
  React.useEffect(() => {
    if (open && startInEdit && !startInEditConsumed.current) {
      setIsEditing(true);
      startInEditConsumed.current = true;
    }
  }, [open, startInEdit]);

  // Reset edit mode and consumption guard when encounter changes
  React.useEffect(() => {
    if (startInEdit) return;
    setIsEditing(false);
    startInEditConsumed.current = false;
  }, [encounterId, startInEdit]);

  // Fetch photos and notes when encounterId is provided
  React.useEffect(() => {
    if (!encounterId) return;

    // Clear stale data immediately to prevent showing previous encounter's content
    setPhotos([]);
    setNotes(null);

    const fetchData = async () => {
      const supabase = createSupabaseBrowserClient();

      // Fetch photos
      const { data: photosData, error: photosError } = await supabase
        .from('encounter_photos')
        .select('photo_url, is_private')
        .eq('encounter_id', encounterId);

      if (photosError) {
        console.error('Error fetching photos:', photosError);
      } else if (photosData) {
        setPhotos(photosData.map((p) => ({
          url: p.photo_url,
          isPrivate: p.is_private,
        })));
      }

      // Fetch and decrypt notes
      const { data: encounterData, error: encounterError } = await supabase
        .from('encounters')
        .select('notes_encrypted')
        .eq('id', encounterId)
        .single();

      if (encounterError) {
        console.error('Error fetching notes:', encounterError);
      } else if (encounterData?.notes_encrypted) {
        try {
          const response = await fetch('/api/decrypt-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted: encounterData.notes_encrypted, encounterId }),
          });
          const result = await response.json();
          if (result.decrypted) {
            setNotes(result.decrypted);
          }
        } catch (error) {
          console.error('Error decrypting notes:', error);
        }
      }
    };

    fetchData();
  }, [encounterId]);

  const handleDelete = () => {
    if (!encounterId) return;

    startTransition(async () => {
      const res = await deleteEncounterAction(encounterId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(t("deleted"));
      onClose();
      router.refresh();
    });
  };

  const getLocation = () => {
    return initialData?.location_label || initialData?.city || initialData?.country || "";
  };

  // If editing, show QuickLogDrawerForm
  if (isEditing && initialData) {
    return (
      <Dialog.Root open={open} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border-t border-white/5 bg-[#0b0f18] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <div className="flex shrink-0 items-center justify-between px-6 pb-2 pt-5 border-b border-slate-800">
                <Dialog.Title className="text-[16px] font-light text-slate-200">{t("editEncounter")}</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white">
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </Dialog.Close>
              </div>
              <QuickLogDrawerForm
                              partners={partners}
                              tags={tags}
                              defaultSelectionId={initialData.partner?.id}
                              defaultLocationMode={initialData.location_precision ?? "off"}
                              recordedDuration={initialData.duration_minutes}
                              recordedStartTime={new Date(initialData.started_at)}
                              onClose={() => {
                                setIsEditing(false);
                              }}
                              onSuccess={() => {
                                setIsEditing(false);
                                onClose();
                                router.refresh();
                              }}
                            />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // Read-only view
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border-t border-white/5 bg-[#0b0f18] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom max-h-[90vh] overflow-y-auto">
          <div className="relative">
            <div className="flex shrink-0 items-center justify-between px-6 pb-2 pt-5 border-b border-slate-800">
              <Dialog.Title className="text-[16px] font-light text-slate-200">{t("encounterDetails")}</Dialog.Title>
              <div className="flex items-center gap-2">
                {encounterId && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                    title={t("editEncounter")}
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <Dialog.Close asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white">
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            <div className="overflow-y-auto px-4 py-6 space-y-6">
              {/* Partner */}
              {initialData?.partner && (
                <div className="space-y-3">
                  <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">{t("partner")}</p>
                  <div className="flex items-center gap-3">
                    {initialData.partner.avatar_url ? (
                      <AvatarViewer src={initialData.partner.avatar_url}>
                        <img src={initialData.partner.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      </AvatarViewer>
                    ) : (
                      <div
                        className="h-10 w-10 rounded-full"
                        style={{
                          backgroundImage: `linear-gradient(to bottom right, ${initialData.partner.color || "#3b82f6"}, #8b5cf6)`,
                        }}
                      />
                    )}
                    <span className="text-[15px] text-slate-200">{initialData.partner.nickname}</span>
                  </div>
                </div>
              )}

              {/* Time & Duration */}
              <div className="space-y-3">
                <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">{t("time")}</p>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-[13px]">
                      {initialData ? formatDateInTimezone(initialData.started_at, "MMM d, yyyy", initialData.timezone || "UTC") : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-[13px]">
                      {initialData ? formatDateInTimezone(initialData.started_at, "h:mm a", initialData.timezone || "UTC") : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-[13px]">
                      {t("duration")}: {formatDuration(initialData?.duration_minutes ?? null)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mood */}
              {initialData?.mood && (
                <div className="space-y-3">
                  <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">{t("mood")}</p>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-[24px]">{getMoodEmoji(initialData.mood)}</span>
                    <span className="text-[13px]">{initialData.mood}</span>
                  </div>
                </div>
              )}

              {/* Rating */}
              {initialData && initialData.rating !== null && (
                <div className="space-y-3">
                  <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">{t("rating")}</p>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`text-[24px] ${idx < (initialData.rating ?? 0) ? "text-[#f43f5e]" : "text-slate-700"}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              {getLocation() && (
                <div className="space-y-3">
                  <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">{t("location")}</p>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin size={14} className="text-slate-500" />
                      <span className="text-[13px]">{getLocation()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              {initialData?.tags && initialData.tags.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">{t("tags")}</p>
                  <div className="flex flex-wrap gap-2">
                    {initialData.tags.map((tag: any) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[11px] text-slate-400"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {photos.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">{t("photos")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square">
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoViewerIndex(idx);
                            setPhotoViewerOpen(true);
                          }}
                          className="h-full w-full"
                        >
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
              )}
              <ImageViewer
                images={photos}
                initialIndex={photoViewerIndex}
                open={photoViewerOpen}
                onOpenChange={setPhotoViewerOpen}
              />

              {/* Private Notes */}
              {notes && (
                <div className="space-y-3">
                  <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">{t("privateNotes")}</p>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-[13px] text-slate-300 whitespace-pre-wrap">{notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-slate-800 p-4">
              <Button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                {pending ? "Deleting..." : t("deleteEncounter")}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

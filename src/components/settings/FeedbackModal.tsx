"use client";

import { type ChangeEvent, useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, MessageCircle, Send, X, Bug, Lightbulb, Coffee } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { submitFeedbackAction } from "@/features/feedback/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/compressImage";

type FeedbackCategory = "bug" | "suggestion" | "chat";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const t = useTranslations("feedback");
  const tc = useTranslations("common");
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    {
      value: "bug" as FeedbackCategory,
      label: t("bugReport"),
      icon: <Bug className="h-5 w-5" />,
      description: t("bugReportDesc"),
    },
    {
      value: "suggestion" as FeedbackCategory,
      label: t("suggestion"),
      icon: <Lightbulb className="h-5 w-5" />,
      description: t("suggestionDesc"),
    },
    {
      value: "chat" as FeedbackCategory,
      label: t("justChat"),
      icon: <Coffee className="h-5 w-5" />,
      description: t("justChatDesc"),
    },
  ];

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("imageError"));
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error(t("imageSizeError"));
      return;
    }

    const compressed = await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920 });
    setImageFile(compressed);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(compressed);
  };

  const removeImage = () => {
    setImage(null);
    setImageFile(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error(t("contentError"));
      return;
    }

    setSubmitting(true);
    setUploading(true);
    try {
      let imageUrl: string | null = null;

      // Upload image client-side first if provided
      if (imageFile) {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error(t("loginError"));
          return;
        }

        const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('feedback')
          .upload(filePath, imageFile);

        if (uploadError) {
          toast.error(t("imageUploadFailed", { error: uploadError.message }));
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('feedback')
          .getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      const result = await submitFeedbackAction({
        category,
        content: content.trim(),
        imageUrl,
      });

      if (!result.ok) {
        toast.error(result.error || t("submitting"));
        return;
      }

      toast.success(t("success"));
      setContent("");
      setImage(null);
      setImageFile(null);
      setCategory("bug");
      onOpenChange(false);
    } catch (error) {
      toast.error(t("submitting"));
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 focus:outline-none">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="flex items-center gap-2 text-[20px] font-light text-content">
              <MessageCircle className="h-5 w-5 text-destructive" />
              {t("feedbackCenter")}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-content">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-3 block text-[13px] uppercase tracking-[0.12em] text-muted">
                {t("category")}
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
                      category === cat.value
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-border bg-surface/50 text-muted hover:border-border hover:text-content"
                    )}
                  >
                    {cat.icon}
                    <span className="text-[13px] font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="feedback-content" className="mb-2 block text-[13px] text-muted">
                {t("yourMessage")}
              </label>
              <textarea
                id="feedback-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("contentPlaceholderLong")}
                rows={5}
                className="w-full rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-[14px] text-content outline-none transition-colors placeholder:text-muted focus:border-rose-500/50 resize-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] text-muted">
                {t("screenshot")}
              </label>
              {image ? (
                <div className="relative inline-block">
                  <img
                    src={image}
                    alt="Uploaded screenshot"
                    className="max-h-40 w-auto rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white transition-colors hover:bg-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface/50 transition-colors hover:border-rose-500/50 hover:bg-surface/50">
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <Camera className="h-5 w-5" />
                    <span className="text-[13px]">{t("clickToUpload")}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="h-10 rounded-xl bg-surface px-4 text-[14px] text-content transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !content.trim()}
                className="flex h-10 items-center gap-2 rounded-xl bg-destructive px-4 text-[14px] text-white transition-colors hover:bg-destructive disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  t("submitting")
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t("sendFeedback")}
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-[12px] text-muted">
              {t("orEmail")}{" "}
              <a
                href="mailto:encounter.support@proton.me"
                className="text-destructive transition-colors hover:text-destructive hover:underline"
              >
                encounter.support@proton.me
              </a>
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

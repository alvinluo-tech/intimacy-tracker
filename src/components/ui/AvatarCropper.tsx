"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

function getCroppedImg(imageUrl: string, pixelCrop: Area): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const image = await createImage(imageUrl);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        0.9
      );
    } catch (err) {
      reject(err);
    }
  });
}

type AvatarCropperProps = {
  imageUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (croppedBlob: Blob) => void;
};

export function AvatarCropper({ imageUrl, open, onOpenChange, onCropComplete }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((z: number) => {
    setZoom(z);
  }, []);

  const onCropAreaComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || processing) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImg(imageUrl, croppedAreaPixels);
      onCropComplete(blob);
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 focus:outline-none">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-[18px] font-light text-content">Crop Avatar</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-content">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="relative mx-auto h-72 w-72 overflow-hidden rounded-xl bg-surface">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaComplete}
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-[12px] text-muted">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="h-10 rounded-xl bg-surface px-4 text-[14px] text-content transition-colors hover:bg-surface">
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={processing || !croppedAreaPixels}
              onClick={handleSave}
              className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Cropping..." : "Save"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

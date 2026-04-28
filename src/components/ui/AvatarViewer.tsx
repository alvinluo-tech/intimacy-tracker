"use client";

import { type ReactNode, useState } from "react";
import { ImageViewer } from "./ImageViewer";

type AvatarViewerProps = {
  src: string | null;
  children: ReactNode;
};

export function AvatarViewer({ src, children }: AvatarViewerProps) {
  const [open, setOpen] = useState(false);

  if (!src) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer [&>img]:cursor-pointer"
      >
        {children}
      </button>
      <ImageViewer
        images={[{ url: src }]}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

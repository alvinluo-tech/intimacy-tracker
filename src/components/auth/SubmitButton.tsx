"use client";

import { useFormStatus } from "react-dom";
import type { ComponentPropsWithoutRef } from "react";
import { Button } from "@/components/ui/button";

type Variant = "primary" | "ghost" | "outline";

export function SubmitButton({
  children,
  className,
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      isLoading={pending}
      {...props}
    >
      {children}
    </Button>
  );
}

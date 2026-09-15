"use client";

import { type ButtonHTMLAttributes, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./index";

/** Submit button that shows a pending state — for Server Actions slow enough (AI generation)
 * that submitting without feedback reads as frozen. */
export function SubmitButton({
  children,
  pendingText = "Working…",
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingText?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}

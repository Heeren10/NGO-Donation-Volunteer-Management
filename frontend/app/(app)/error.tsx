"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/12 text-danger-text">
        <WifiOff size={22} />
      </span>
      <h1 className="text-lg font-semibold text-ink">Couldn't load this page</h1>
      <p className="text-sm text-muted">{error.message || "Something went wrong talking to the server."}</p>
      <Button onClick={reset} className="mt-2">
        Try again
      </Button>
    </div>
  );
}

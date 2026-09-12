"use client";

import { useState } from "react";

const PRESETS = [500, 1000, 2500, 5000];

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function AmountPicker({ defaultValue = 1000 }: { defaultValue?: number }) {
  const [amount, setAmount] = useState(defaultValue);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            className={cx(
              "rounded-lg border px-2 py-2 text-sm font-medium transition-colors duration-150",
              amount === preset ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:bg-surface-2"
            )}
          >
            ₹{preset}
          </button>
        ))}
      </div>
      <input
        type="number"
        name="amount"
        min="1"
        step="1"
        required
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus-visible:border-primary"
      />
    </div>
  );
}

"use client";

import { Printer } from "lucide-react";
import { Button } from "./index";

/** Browser-native print → the OS "Save as PDF" option already covers PDF export,
 * no PDF library needed. `print:hidden` on surrounding chrome keeps the printout clean. */
export function PrintButton() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
      <Printer size={13} />
      Print / Save as PDF
    </Button>
  );
}

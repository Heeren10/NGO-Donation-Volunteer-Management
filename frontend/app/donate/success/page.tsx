import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge, Card } from "@/components/ui";

export default async function DonateSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; amount?: string; name?: string; date?: string; campaign?: string }>;
}) {
  const { ref, amount, name, date, campaign } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/12 text-accent">
        <CheckCircle2 size={28} />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Thank you, {name || "friend"}!</h1>
        <p className="mt-1 text-sm text-muted">Your donation has been recorded.</p>
      </div>

      <Card className="w-full text-left">
        <div className="flex flex-col divide-y divide-border text-sm">
          <div className="flex items-center justify-between py-2">
            <span className="text-muted">Amount</span>
            <span className="font-semibold text-ink">₹{amount}</span>
          </div>
          {campaign && (
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">Campaign</span>
              <Badge variant="accent">{campaign}</Badge>
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <span className="text-muted">Date</span>
            <span className="text-ink">{date}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted">Reference</span>
            <span className="font-mono text-xs text-ink">{ref}</span>
          </div>
        </div>
      </Card>

      <Link href="/donate" className="text-sm font-medium text-primary-text hover:underline">
        Make another donation
      </Link>
    </div>
  );
}

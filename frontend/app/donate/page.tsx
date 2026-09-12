import { redirect } from "next/navigation";
import { CreditCard, Smartphone, Landmark, ShieldCheck } from "lucide-react";
import { api, type PaymentMethod } from "@/lib/api";
import { AuthLayout, Button, Input, Label, Select } from "@/components/ui";
import AmountPicker from "./AmountPicker";

const METHODS: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: "card", label: "Card", icon: CreditCard },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "netbanking", label: "Netbanking", icon: Landmark },
];

export default async function DonatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const campaigns = await api.public.campaigns();

  async function donate(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const amount = Number(formData.get("amount"));
    const campaign_id = Number(formData.get("campaign_id")) || undefined;
    const method = formData.get("method") as PaymentMethod;
    if (!name || !amount || amount <= 0 || !method) redirect("/donate?error=1");

    let receipt;
    try {
      receipt = await api.public.donate({ name, email: email || undefined, amount, campaign_id, method });
    } catch {
      redirect("/donate?error=1");
    }

    const params = new URLSearchParams({
      ref: receipt.reference,
      amount: String(receipt.amount),
      name: receipt.donor_name,
      date: receipt.date,
      ...(receipt.campaign_name ? { campaign: receipt.campaign_name } : {}),
    });
    redirect(`/donate/success?${params.toString()}`);
  }

  return (
    <AuthLayout
      heroTitle="Every donation reaches a real campaign, tracked to the rupee."
      heroSubtitle="No middlemen, no hidden fees — your contribution is logged against the campaign you choose and reflected in our public impact reports."
    >
      <div className="flex flex-col gap-1 animate-fade-up">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Make a donation</h2>
        <p className="text-sm text-muted">One-time contribution — no account needed.</p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-text animate-fade-up">
          Something went wrong — please check the amount and try again.
        </p>
      )}

      <form action={donate} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>Your name</Label>
          <Input name="name" required placeholder="Jane Doe" autoFocus />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Email (for your receipt)</Label>
          <Input name="email" type="email" placeholder="you@example.com" />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Campaign</Label>
          <Select name="campaign_id" defaultValue="">
            <option value="">General fund</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Amount (₹)</Label>
          <AmountPicker />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Payment method</Label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ value, label, icon: Icon }, i) => (
              <label
                key={value}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-xs font-medium text-muted transition-colors duration-150 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary hover:bg-surface-2"
              >
                <input type="radio" name="method" value={value} defaultChecked={i === 0} className="sr-only" />
                <Icon size={16} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" className="w-full">
          Donate now
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <ShieldCheck size={12} />
          Demo checkout — no real payment is processed.
        </p>
      </form>
    </AuthLayout>
  );
}

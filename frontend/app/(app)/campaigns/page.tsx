import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Megaphone, PlusCircle } from "lucide-react";
import { api, type CampaignCategory } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Badge, Button, CAMPAIGN_CATEGORY_LABELS, Card, EmptyState, Field, FieldGrid, Input, PageHeader, ProgressBar, Select } from "@/components/ui";

const STATUS_VARIANT = { draft: "default", active: "primary", completed: "accent" } as const;

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; category?: string }>;
}) {
  const { name: prefillName, category: prefillCategory } = await searchParams;
  const [campaigns, session] = await Promise.all([api.campaigns.list(), getSession()]);
  const isAdmin = session?.role === "admin";

  async function addCampaign(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const goal_amount = Number(formData.get("goal_amount"));
    const start_date = String(formData.get("start_date") || "");
    const category = String(formData.get("category") || "") as CampaignCategory | "";
    if (!name || !goal_amount || !start_date) return;
    await api.campaigns.create({ name, goal_amount, start_date, category: category || undefined });
    revalidatePath("/campaigns");
    revalidatePath("/");
    revalidatePath("/events");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
      <PageHeader icon={<Megaphone size={18} />} title="Campaigns" subtitle={`${campaigns.length} fundraising campaign${campaigns.length === 1 ? "" : "s"}`} />

      <div className="flex flex-col gap-3">
        {campaigns.length === 0 && (
          <EmptyState icon={<Megaphone size={22} />} title="No campaigns yet" hint="Launch your first fundraising campaign below." />
        )}
        {campaigns.map((c) => {
          const pct = c.goal_amount > 0 ? (c.raised_amount / c.goal_amount) * 100 : 0;
          return (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card hover>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    {c.name}
                    <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    {c.category && <Badge>{CAMPAIGN_CATEGORY_LABELS[c.category]}</Badge>}
                  </span>
                  <span className="text-muted">₹{c.raised_amount.toLocaleString()} / ₹{c.goal_amount.toLocaleString()}</span>
                </div>
                <div className="mt-2.5">
                  <ProgressBar pct={pct} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {isAdmin && (
        <Card>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <PlusCircle size={14} className="text-primary" />
            New campaign
          </h2>
          <form action={addCampaign} className="mt-3 flex flex-col gap-4">
            <FieldGrid>
              <Field label="Name" span={2}>
                <Input name="name" placeholder="Clean Water Drive" defaultValue={prefillName ?? ""} required />
              </Field>
              <Field label="Category">
                <Select name="category" defaultValue={prefillCategory ?? ""}>
                  <option value="">None</option>
                  {Object.entries(CAMPAIGN_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Goal amount">
                <Input name="goal_amount" type="number" step="0.01" min="0" required />
              </Field>
              <Field label="Start date" span={2}>
                <Input name="start_date" type="date" required />
              </Field>
            </FieldGrid>
            <Button type="submit" className="self-start">
              Create campaign
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

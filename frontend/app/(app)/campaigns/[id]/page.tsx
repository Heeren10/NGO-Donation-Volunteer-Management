import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Trash2, CalendarDays, Settings2 } from "lucide-react";
import { api, type CampaignCategory } from "@/lib/api";
import { Badge, Button, CAMPAIGN_CATEGORY_LABELS, Card, EmptyState, EVENT_CATEGORY_LABELS, Field, FieldGrid, Input, PageHeader, ProgressBar, Select } from "@/components/ui";

const STATUS_OPTIONS = ["draft", "active", "completed"] as const;

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaignId = Number(id);

  const [campaign, events] = await Promise.all([
    api.campaigns.get(campaignId).catch(() => null),
    api.events.list(),
  ]);

  if (!campaign) notFound();

  const campaignEvents = events.filter((e) => e.campaign_id === campaignId);
  const pct = campaign.goal_amount > 0 ? (campaign.raised_amount / campaign.goal_amount) * 100 : 0;

  async function updateCampaign(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const goal_amount = Number(formData.get("goal_amount"));
    const start_date = String(formData.get("start_date") || "");
    const end_date = String(formData.get("end_date") || "");
    const status = String(formData.get("status") || "") as (typeof STATUS_OPTIONS)[number];
    const category = String(formData.get("category") || "") as CampaignCategory | "";
    if (!name || !goal_amount || !start_date) return;
    await api.campaigns.update(campaignId, {
      name,
      goal_amount,
      start_date,
      end_date: end_date || undefined,
      status,
      category: category || undefined,
    });
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/campaigns");
  }

  async function deleteCampaign() {
    "use server";
    await api.campaigns.remove(campaignId);
    revalidatePath("/campaigns");
    revalidatePath("/events");
    revalidatePath("/");
    redirect("/campaigns");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title={campaign.name}
          subtitle={`₹${campaign.raised_amount.toLocaleString()} raised of ₹${campaign.goal_amount.toLocaleString()} goal`}
        />
        <form action={deleteCampaign}>
          <Button type="submit" variant="danger" size="sm">
            <Trash2 size={13} />
            Delete
          </Button>
        </form>
      </div>

      <div>
        <ProgressBar pct={pct} />
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <Settings2 size={14} className="text-primary" />
            Campaign details
          </h2>
          <form action={updateCampaign} className="mt-3 flex flex-col gap-4">
            <FieldGrid>
              <Field label="Name" span={2}>
                <Input name="name" defaultValue={campaign.name} required />
              </Field>
              <Field label="Category">
                <Select name="category" defaultValue={campaign.category ?? ""}>
                  <option value="">None</option>
                  {Object.entries(CAMPAIGN_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={campaign.status}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Goal amount" span={2}>
                <Input name="goal_amount" type="number" step="0.01" min="0" defaultValue={campaign.goal_amount} required />
              </Field>
              <Field label="Start date">
                <Input name="start_date" type="date" defaultValue={campaign.start_date} required />
              </Field>
              <Field label="End date">
                <Input name="end_date" type="date" defaultValue={campaign.end_date ?? ""} />
              </Field>
            </FieldGrid>
            <Button type="submit" className="self-start">
              Save changes
            </Button>
          </form>
        </Card>

        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <CalendarDays size={14} className="text-primary" />
            Events under this campaign
          </h2>
          {campaignEvents.length === 0 ? (
            <EmptyState title="No events yet" hint="Events linked to this campaign will show up here." />
          ) : (
            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {campaignEvents.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2"
                >
                  <span className="font-medium text-ink">{e.name}</span>
                  <div className="flex items-center gap-2">
                    {e.category && <Badge variant="accent">{EVENT_CATEGORY_LABELS[e.category]}</Badge>}
                    <Badge>{e.date}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

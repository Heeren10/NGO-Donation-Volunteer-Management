import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { api, type EventCategory } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Badge, Button, Card, EmptyState, EVENT_CATEGORY_LABELS, Input, Label, PageHeader, Select } from "@/components/ui";

export default async function EventsPage() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const [events, campaigns] = await Promise.all([api.events.list(), isAdmin ? api.campaigns.list() : Promise.resolve([])]);

  async function addEvent(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const date = String(formData.get("date") || "");
    const location = String(formData.get("location") || "").trim();
    const roles_needed = String(formData.get("roles_needed") || "").trim();
    const category = String(formData.get("category") || "") as EventCategory | "";
    const campaign_id = Number(formData.get("campaign_id")) || undefined;
    if (!name || !date) return;
    await api.events.create({
      name,
      date,
      location: location || undefined,
      roles_needed: roles_needed || undefined,
      category: category || undefined,
      campaign_id,
    });
    revalidatePath("/events");
    revalidatePath("/");
    revalidatePath("/my");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
      <PageHeader icon={<CalendarDays size={18} />} title="Events" subtitle={`${events.length} event${events.length === 1 ? "" : "s"} scheduled`} />

      {events.length === 0 ? (
        <EmptyState icon={<CalendarDays size={22} />} title="No events yet" hint="Create your first event below to start coordinating volunteers." />
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/12 text-primary">
                <span className="text-[10px] font-medium leading-none">{new Date(e.date).toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</span>
                <span className="text-sm font-semibold leading-none">{new Date(e.date).getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium text-ink">
                  {e.name}
                  {e.category && <Badge>{EVENT_CATEGORY_LABELS[e.category]}</Badge>}
                </span>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {e.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {e.location}
                    </span>
                  )}
                  {e.roles_needed && <span>Needs: {e.roles_needed}</span>}
                </div>
              </div>
              <Badge>{e.date}</Badge>
            </Link>
          ))}
        </div>
      )}

      {isAdmin && (
        <Card className="sm:max-w-sm">
          <span className="text-sm font-medium text-ink">New event</span>
          <form action={addEvent} className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label>Name</Label>
              <Input name="name" placeholder="Food Drive" required />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Category</Label>
              <Select name="category" defaultValue="">
                <option value="">None</option>
                {Object.entries(EVENT_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Date</Label>
              <Input name="date" type="date" required />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Location</Label>
              <Input name="location" placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Roles needed</Label>
              <Input name="roles_needed" placeholder="first-aid, driving" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Campaign</Label>
              <Select name="campaign_id" defaultValue="">
                <option value="">No campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="mt-1 self-start">
              Create event
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

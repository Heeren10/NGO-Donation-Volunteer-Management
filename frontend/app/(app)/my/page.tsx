import { type CSSProperties } from "react";
import { revalidatePath } from "next/cache";
import { CalendarDays, MapPin, Clock, Award, Sparkles, CalendarCheck } from "lucide-react";
import { api, type EventCategory } from "@/lib/api";
import { Badge, Button, Card, EmptyState, Input, Label, ProgressRing } from "@/components/ui";

const STATUS_VARIANT = {
  pending: "default",
  confirmed: "primary",
  rejected: "danger",
  attended: "accent",
  no_show: "danger",
} as const;

const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  fundraising: "Fundraising",
  awareness: "Awareness",
  community_drive: "Community Drive",
  workshop: "Workshop",
  training: "Training",
  charity_campaign: "Charity Campaign",
};

const MILESTONES = [
  { hours: 1, label: "First Steps" },
  { hours: 5, label: "Getting Started" },
  { hours: 10, label: "Regular" },
  { hours: 25, label: "Dedicated" },
  { hours: 50, label: "Champion" },
  { hours: 100, label: "Legend" },
];

export default async function MyDashboard() {
  const me = await api.auth.me();
  const volunteer = me.volunteer_id ? await api.volunteers.get(me.volunteer_id) : null;
  const [events, mySignups] = await Promise.all([
    api.events.list(),
    me.volunteer_id ? api.signups.list({ volunteerId: me.volunteer_id }) : Promise.resolve([]),
  ]);

  const appliedEventIds = new Set(mySignups.map((s) => s.event_id));
  const hours = volunteer?.total_hours ?? 0;
  const attendedCount = mySignups.filter((s) => s.status === "attended").length;
  const upcomingCount = mySignups.filter((s) => s.status === "confirmed").length;

  const earned = MILESTONES.filter((m) => hours >= m.hours);
  const next = MILESTONES.find((m) => hours < m.hours);
  const ringPct = next ? (hours / next.hours) * 100 : 100;
  const currentBadge = earned[earned.length - 1];

  async function updateProfile(formData: FormData) {
    "use server";
    if (!volunteer) return;
    const name = String(formData.get("name") || "").trim();
    const skills = String(formData.get("skills") || "").trim();
    const availability = String(formData.get("availability") || "").trim();
    const location = String(formData.get("location") || "").trim();
    await api.volunteers.update(volunteer.id, { name, skills, availability, location });
    revalidatePath("/my");
  }

  async function apply(formData: FormData) {
    "use server";
    const event_id = Number(formData.get("event_id"));
    await api.signups.apply({ event_id });
    revalidatePath("/my");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8 sm:px-8">
      <Card fill="primary" className="relative overflow-hidden animate-fade-up">
        <HeroPattern />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Hi, {me.name.split(" ")[0]}</h1>
              <p className="mt-0.5 text-sm text-primary-foreground/80">
                {hours > 0
                  ? `You've given ${hours} hours to your community — every one of them counted.`
                  : "Apply to your first event below and start making an impact."}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <CalendarCheck size={15} className="text-primary-foreground/70" />
                <span className="font-semibold">{attendedCount}</span>
                <span className="text-primary-foreground/70">events completed</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={15} className="text-primary-foreground/70" />
                <span className="font-semibold">{upcomingCount}</span>
                <span className="text-primary-foreground/70">upcoming</span>
              </span>
            </div>
            {currentBadge && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium">
                <Award size={13} />
                {currentBadge.label}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <ProgressRing pct={ringPct} tone="gold" size={92}>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold leading-none">{hours}</span>
                <span className="text-[10px] leading-none text-primary-foreground/70">hrs</span>
              </div>
            </ProgressRing>
            <span className="flex items-center gap-1 text-xs text-primary-foreground/70">
              <Sparkles size={11} />
              {next ? `${(next.hours - hours).toFixed(1)}h to ${next.label}` : "All milestones earned!"}
            </span>
          </div>
        </div>
      </Card>

      <section className="grid gap-6 sm:grid-cols-2">
        <Card>
          <span className="text-sm font-medium text-ink">Your profile</span>
          {volunteer ? (
            <form action={updateProfile} className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label>Name</Label>
                <Input name="name" defaultValue={volunteer.name} required />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Skills</Label>
                <Input name="skills" defaultValue={volunteer.skills ?? ""} placeholder="first-aid, logistics" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Availability</Label>
                <Input name="availability" defaultValue={volunteer.availability ?? ""} placeholder="Weekends" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Location</Label>
                <Input name="location" defaultValue={volunteer.location ?? ""} />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <Clock size={13} />
                {hours} hours logged
              </div>
              <Button type="submit" className="self-start">Save changes</Button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">No volunteer profile linked to this account.</p>
          )}
        </Card>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">My applications</h2>
          {mySignups.length === 0 ? (
            <EmptyState title="No applications yet" hint="Apply to an event below — staff will review it." />
          ) : (
            <div className="flex flex-col gap-2">
              {mySignups.map((s) => (
                <Card key={s.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{s.event_name || `Event #${s.event_id}`}</span>
                    <Badge variant={STATUS_VARIANT[s.status]}>{s.status.replace("_", " ")}</Badge>
                  </div>
                  {s.hours_logged > 0 && <div className="mt-0.5 text-xs text-muted">{s.hours_logged} hours logged</div>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Open events</h2>
        {events.length === 0 ? (
          <EmptyState icon={<CalendarDays size={22} />} title="No events posted yet" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((e, i) => {
              const applied = appliedEventIds.has(e.id);
              return (
                <Card
                  key={e.id}
                  hover
                  glow="accent"
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` } as CSSProperties}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <span className="text-[10px] font-medium leading-none">
                        {new Date(e.date).toLocaleDateString(undefined, { month: "short" }).toUpperCase()}
                      </span>
                      <span className="text-base font-semibold leading-none">{new Date(e.date).getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{e.name}</span>
                        {e.category && <Badge variant="accent">{EVENT_CATEGORY_LABELS[e.category]}</Badge>}
                      </div>
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
                  </div>
                  <div className="mt-3 flex justify-end">
                    {applied || !volunteer ? (
                      <Badge>{applied ? "Applied" : "—"}</Badge>
                    ) : (
                      <form action={apply}>
                        <input type="hidden" name="event_id" value={e.id} />
                        <Button type="submit" variant="accent" size="sm">Apply</Button>
                      </form>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function HeroPattern() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden>
      <pattern id="my-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="currentColor" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#my-dots)" />
    </svg>
  );
}

import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CloudLightning, MapPin, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { location } = await searchParams;

  let result: Awaited<ReturnType<typeof api.weather.check>> | null = null;
  let notFound = false;
  if (location) {
    try {
      result = await api.weather.check(location);
    } catch (err) {
      notFound = err instanceof Error && err.message.startsWith("404");
    }
  }
  const volunteers = location ? await api.volunteers.list().catch(() => []) : [];

  const nearbyVolunteers = result?.alert
    ? volunteers.filter((v) => {
        if (!v.location) return false;
        const a = v.location.toLowerCase();
        const b = result.location.toLowerCase();
        return a.includes(b) || b.includes(a);
      })
    : [];

  async function notifyVolunteer(formData: FormData) {
    "use server";
    const volunteer_id = Number(formData.get("volunteer_id"));
    const content = String(formData.get("content") || "");
    await api.communications.create({ volunteer_id, channel: "email", content });
    revalidatePath("/alerts");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8 sm:px-8">
      <PageHeader
        icon={<CloudLightning size={18} />}
        title="Proactive Risk Alerts"
        subtitle="Checks a region for severe weather and drafts an emergency relief campaign before it hits."
      />

      <form className="flex gap-2">
        <Input name="location" defaultValue={location ?? ""} placeholder="City or region, e.g. Kochi" className="flex-1" required />
        <Button type="submit">Check</Button>
      </form>

      {!location && (
        <p className="text-sm text-muted">Enter a region your NGO operates in — this checks the next 3 days for heavy rain or thunderstorms.</p>
      )}

      {location && notFound && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-text">
          <TriangleAlert size={14} className="shrink-0" />
          Couldn&apos;t find that location — try a nearby major city instead.
        </div>
      )}

      {location && !result && !notFound && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-text">
          <TriangleAlert size={14} className="shrink-0" />
          Couldn&apos;t check right now — the weather service may be unreachable. Try again shortly.
        </div>
      )}

      {result && !result.alert && (
        <Card className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
            <ShieldCheck size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">No severe weather forecast</p>
            <p className="text-xs text-muted">{result.location} looks clear for the next 3 days.</p>
          </div>
        </Card>
      )}

      {result?.alert && (() => {
        const alert = result.alert;
        const draft = result.draft;
        const notifyMessage = `Heads up — ${alert.condition.toLowerCase()} is forecast for ${result.location} on ${alert.date}. We're launching "${draft?.name ?? "an emergency relief campaign"}" — reply if you're available to help.`;
        return (
          <>
            <Card className="border-danger/30 bg-danger/8">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger-text">
                  <TriangleAlert size={16} />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{alert.condition} expected in {result.location}</p>
                  <p className="text-xs text-muted">{alert.date} · {alert.precipitation_mm}mm of rain forecast</p>
                </div>
              </div>
            </Card>

            {draft && (
              <Card>
                <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <Sparkles size={14} className="text-accent" />
                  AI-drafted emergency campaign
                </h2>
                <p className="mt-2 text-sm font-medium text-ink">{draft.name}</p>
                <p className="mt-1 text-sm text-muted">{draft.description}</p>
                <Link href={`/campaigns?name=${encodeURIComponent(draft.name)}&category=disaster_relief`} className="mt-3 inline-block">
                  <Button type="button" variant="accent" size="sm">Start this campaign</Button>
                </Link>
              </Card>
            )}

            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <MapPin size={14} className="text-primary" />
                Nearby volunteers to notify
              </h2>
              {nearbyVolunteers.length === 0 ? (
                <p className="text-sm text-muted">No volunteers on file near {result.location}.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {nearbyVolunteers.map((v) => (
                    <Card key={v.id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-medium text-ink">{v.name}</span>
                        <Badge>{v.location}</Badge>
                      </div>
                      <form action={notifyVolunteer}>
                        <input type="hidden" name="volunteer_id" value={v.id} />
                        <input type="hidden" name="content" value={notifyMessage} />
                        <SubmitButton size="sm" pendingText="Sending…">Notify</SubmitButton>
                      </form>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        );
      })()}
    </div>
  );
}

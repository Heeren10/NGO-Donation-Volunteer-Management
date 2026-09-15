import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CalendarDays, Settings2, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { api, type EventCategory } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Badge, Button, Card, EmptyState, EVENT_CATEGORY_LABELS, Field, FieldGrid, Input, PageHeader, Select, SIGNUP_STATUS_LABEL, SIGNUP_STATUS_VARIANT } from "@/components/ui";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const eventId = Number(id);
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  const [event, signups, suggestions, campaigns] = await Promise.all([
    api.events.get(eventId).catch(() => null),
    api.signups.list({ eventId }),
    isAdmin ? api.events.suggestedVolunteers(eventId) : Promise.resolve([]),
    isAdmin ? api.campaigns.list() : Promise.resolve([]),
  ]);

  if (!event) notFound();

  const mySignup = !isAdmin ? signups[0] : undefined; // backend already scopes a volunteer's own list to just their signups
  const eventHasPassed = event.date <= new Date().toISOString().slice(0, 10);

  async function invite(formData: FormData) {
    "use server";
    const volunteer_id = Number(formData.get("volunteer_id"));
    try {
      await api.signups.apply({ event_id: eventId, volunteer_id });
    } catch {
      redirect(`/events/${eventId}?error=1`);
    }
    revalidatePath(`/events/${eventId}`);
  }

  async function acceptSignup(formData: FormData) {
    "use server";
    await api.signups.update(Number(formData.get("signup_id")), { status: "confirmed" });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/my");
  }

  async function rejectSignup(formData: FormData) {
    "use server";
    await api.signups.update(Number(formData.get("signup_id")), { status: "rejected" });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/my");
  }

  async function markAttended(formData: FormData) {
    "use server";
    const signupId = Number(formData.get("signup_id"));
    const hours = Number(formData.get("hours") || 0);
    await api.signups.update(signupId, { status: "attended", hours_logged: hours });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/volunteers");
    revalidatePath("/my");
    revalidatePath("/");
  }

  async function markAbsent(formData: FormData) {
    "use server";
    await api.signups.update(Number(formData.get("signup_id")), { status: "no_show" });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/my");
  }

  async function cancelSignup(formData: FormData) {
    "use server";
    await api.signups.update(Number(formData.get("signup_id")), { status: "cancelled" });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/my");
  }

  async function apply() {
    "use server";
    try {
      await api.signups.apply({ event_id: eventId });
    } catch {
      redirect(`/events/${eventId}?error=1`);
    }
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/my");
  }

  async function cancelMySignup(formData: FormData) {
    "use server";
    await api.signups.update(Number(formData.get("signup_id")), { status: "cancelled" });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/my");
  }

  async function updateEvent(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const date = String(formData.get("date") || "");
    const location = String(formData.get("location") || "").trim();
    const roles_needed = String(formData.get("roles_needed") || "").trim();
    const category = String(formData.get("category") || "") as EventCategory | "";
    const campaign_id = Number(formData.get("campaign_id")) || undefined;
    if (!name || !date) return;
    await api.events.update(eventId, {
      name,
      date,
      location: location || undefined,
      roles_needed: roles_needed || undefined,
      category: category || undefined,
      campaign_id,
    });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/my");
  }

  async function deleteEvent() {
    "use server";
    await api.events.remove(eventId);
    revalidatePath("/events");
    revalidatePath("/my");
    revalidatePath("/");
    redirect("/events");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          icon={<CalendarDays size={18} />}
          title={event.name}
          subtitle={[event.location, event.date].filter(Boolean).join(" · ")}
          action={event.category && <Badge variant="accent">{EVENT_CATEGORY_LABELS[event.category]}</Badge>}
        />
        {isAdmin && (
          <form action={deleteEvent}>
            <Button type="submit" variant="danger" size="sm">
              <Trash2 size={13} />
              Delete
            </Button>
          </form>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-text">
          <TriangleAlert size={14} className="shrink-0" />
          That volunteer already has a signup for this event.
        </div>
      )}

      {event.roles_needed && (
        <Card className="text-sm text-muted">
          <span className="font-medium text-ink">Roles needed: </span>
          {event.roles_needed}
        </Card>
      )}

      {!isAdmin && (
        <Card>
          {mySignup ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink">Your application</span>
              <div className="flex items-center gap-2">
                <Badge variant={SIGNUP_STATUS_VARIANT[mySignup.status]}>{SIGNUP_STATUS_LABEL[mySignup.status]}</Badge>
                {(mySignup.status === "pending" || mySignup.status === "confirmed") && !eventHasPassed && (
                  <form action={cancelMySignup}>
                    <input type="hidden" name="signup_id" value={mySignup.id} />
                    <Button type="submit" variant="ghost" size="sm">Cancel</Button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <form action={apply} className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">Interested in this one?</span>
              <Button type="submit" variant="accent" size="sm">Apply</Button>
            </form>
          )}
        </Card>
      )}

      {isAdmin && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <Sparkles size={14} className="text-accent" />
            Suggested volunteers
          </h2>
          {suggestions.length === 0 ? (
            <EmptyState title="No matches yet" hint="Suggestions are based on skill and location overlap with this event." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <Card key={s.volunteer_id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-ink">{s.name}</span>
                    {s.matched_skills.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {s.matched_skills.map((skill) => (
                          <Badge key={skill} variant="gold">{skill}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <form action={invite}>
                    <input type="hidden" name="volunteer_id" value={s.volunteer_id} />
                    <Button type="submit" variant="accent" size="sm">Invite</Button>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">Signups</h2>
          {signups.length === 0 ? (
            <EmptyState title="No signups yet" hint="Invite a suggested volunteer above, or wait for applications." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Volunteer</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Hours</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-ink">{s.volunteer_name || `Volunteer #${s.volunteer_id}`}</td>
                      <td className="px-3 py-2 text-muted">{s.role || "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={SIGNUP_STATUS_VARIANT[s.status]}>{SIGNUP_STATUS_LABEL[s.status]}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted">{s.hours_logged}</td>
                      <td className="px-3 py-2">
                        {s.status === "pending" && (
                          <div className="flex items-center gap-1.5">
                            <form action={acceptSignup}>
                              <input type="hidden" name="signup_id" value={s.id} />
                              <Button type="submit" size="sm">Accept</Button>
                            </form>
                            <form action={rejectSignup}>
                              <input type="hidden" name="signup_id" value={s.id} />
                              <Button type="submit" variant="danger" size="sm">Reject</Button>
                            </form>
                          </div>
                        )}
                        {s.status === "confirmed" && !eventHasPassed && (
                          <form action={cancelSignup}>
                            <input type="hidden" name="signup_id" value={s.id} />
                            <Button type="submit" variant="ghost" size="sm">Cancel</Button>
                          </form>
                        )}
                        {s.status === "confirmed" && eventHasPassed && (
                          <div className="flex items-center gap-1.5">
                            <form action={markAttended} className="flex items-center gap-1.5">
                              <input type="hidden" name="signup_id" value={s.id} />
                              <Input name="hours" type="number" step="0.5" min="0" placeholder="hrs" className="w-16 px-2 py-1 text-xs" />
                              <Button type="submit" size="sm">Mark attended</Button>
                            </form>
                            <form action={markAbsent}>
                              <input type="hidden" name="signup_id" value={s.id} />
                              <Button type="submit" variant="danger" size="sm">Mark absent</Button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <Settings2 size={14} className="text-primary" />
            Event details
          </h2>
          <Card>
            <form action={updateEvent} className="flex flex-col gap-4">
              <FieldGrid>
                <Field label="Name" span={2}>
                  <Input name="name" defaultValue={event.name} required />
                </Field>
                <Field label="Category">
                  <Select name="category" defaultValue={event.category ?? ""}>
                    <option value="">None</option>
                    {Object.entries(EVENT_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Date">
                  <Input name="date" type="date" defaultValue={event.date} required />
                </Field>
                <Field label="Location">
                  <Input name="location" defaultValue={event.location ?? ""} placeholder="Optional" />
                </Field>
                <Field label="Roles needed">
                  <Input name="roles_needed" defaultValue={event.roles_needed ?? ""} placeholder="first-aid, driving" />
                </Field>
                <Field label="Campaign" span={2}>
                  <Select name="campaign_id" defaultValue={event.campaign_id ?? ""}>
                    <option value="">No campaign</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>
              </FieldGrid>
              <Button type="submit" className="self-start">
                Save changes
              </Button>
            </form>
          </Card>
        </section>
      )}
    </div>
  );
}

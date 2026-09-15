import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Trash2, CalendarPlus, Clock, MapPin, TriangleAlert, UserCog } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar, Badge, Button, Card, EmptyState, Field, FieldGrid, Input, Select, SIGNUP_STATUS_LABEL, SIGNUP_STATUS_VARIANT } from "@/components/ui";

export default async function VolunteerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const volunteerId = Number(id);

  const [volunteer, signups, events] = await Promise.all([
    api.volunteers.get(volunteerId).catch(() => null),
    api.signups.list({ volunteerId }),
    api.events.list(),
  ]);

  if (!volunteer) notFound();

  const signedUpEventIds = new Set(signups.map((s) => s.event_id));
  const availableEvents = events.filter((e) => !signedUpEventIds.has(e.id));
  const eventDateById = new Map(events.map((e) => [e.id, e.date]));
  const today = new Date().toISOString().slice(0, 10);

  async function updateVolunteer(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const skills = String(formData.get("skills") || "").trim();
    const availability = String(formData.get("availability") || "").trim();
    const location = String(formData.get("location") || "").trim();
    await api.volunteers.update(volunteerId, { name, email, skills, availability, location });
    revalidatePath(`/volunteers/${volunteerId}`);
    revalidatePath("/volunteers");
  }

  async function deleteVolunteer() {
    "use server";
    await api.volunteers.remove(volunteerId);
    revalidatePath("/volunteers");
    revalidatePath("/");
    redirect("/volunteers");
  }

  async function addSignup(formData: FormData) {
    "use server";
    const event_id = Number(formData.get("event_id"));
    const role = String(formData.get("role") || "").trim();
    if (!event_id) return;
    try {
      await api.signups.apply({ event_id, volunteer_id: volunteerId, role: role || undefined });
    } catch {
      redirect(`/volunteers/${volunteerId}?error=1`);
    }
    revalidatePath(`/volunteers/${volunteerId}`);
    revalidatePath("/my");
  }

  async function acceptSignup(formData: FormData) {
    "use server";
    await api.signups.update(Number(formData.get("signup_id")), { status: "confirmed" });
    revalidatePath(`/volunteers/${volunteerId}`);
    revalidatePath("/my");
  }

  async function rejectSignup(formData: FormData) {
    "use server";
    await api.signups.update(Number(formData.get("signup_id")), { status: "rejected" });
    revalidatePath(`/volunteers/${volunteerId}`);
    revalidatePath("/my");
  }

  async function markAttended(formData: FormData) {
    "use server";
    const signupId = Number(formData.get("signup_id"));
    const hours = Number(formData.get("hours") || 0);
    await api.signups.update(signupId, { status: "attended", hours_logged: hours });
    revalidatePath(`/volunteers/${volunteerId}`);
    revalidatePath("/volunteers");
    revalidatePath("/my");
    revalidatePath("/");
  }

  async function markAbsent(formData: FormData) {
    "use server";
    await api.signups.update(Number(formData.get("signup_id")), { status: "no_show" });
    revalidatePath(`/volunteers/${volunteerId}`);
    revalidatePath("/my");
  }

  async function cancelSignup(formData: FormData) {
    "use server";
    await api.signups.update(Number(formData.get("signup_id")), { status: "cancelled" });
    revalidatePath(`/volunteers/${volunteerId}`);
    revalidatePath("/my");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={volunteer.name} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">{volunteer.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {volunteer.total_hours} hrs logged
              </span>
              {volunteer.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} />
                  {volunteer.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <form action={deleteVolunteer}>
          <Button type="submit" variant="danger" size="sm">
            <Trash2 size={13} />
            Delete
          </Button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-text">
          <TriangleAlert size={14} className="shrink-0" />
          This volunteer already has a signup for that event.
        </div>
      )}

      <section className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <UserCog size={14} className="text-primary" />
            Profile
          </h2>
          <form action={updateVolunteer} className="mt-3 flex flex-col gap-4">
            <FieldGrid>
              <Field label="Name" span={2}>
                <Input name="name" defaultValue={volunteer.name} required />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" defaultValue={volunteer.email ?? ""} />
              </Field>
              <Field label="Location">
                <Input name="location" defaultValue={volunteer.location ?? ""} />
              </Field>
              <Field label="Skills">
                <Input name="skills" defaultValue={volunteer.skills ?? ""} placeholder="first-aid, logistics" />
              </Field>
              <Field label="Availability">
                <Input name="availability" defaultValue={volunteer.availability ?? ""} placeholder="Weekends" />
              </Field>
            </FieldGrid>
            <Button type="submit" className="self-start">
              Save changes
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <CalendarPlus size={14} className="text-primary" />
            Sign up for an event
          </h2>
          {availableEvents.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Already signed up for every open event.</p>
          ) : (
            <form action={addSignup} className="mt-3 flex flex-col gap-3">
              <Field label="Event">
                <Select name="event_id" required defaultValue="">
                  <option value="">Select event</option>
                  {availableEvents.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.date})</option>
                  ))}
                </Select>
              </Field>
              <Field label="Role">
                <Input name="role" placeholder="Optional" />
              </Field>
              <Button type="submit" variant="accent" className="self-start">
                Sign up
              </Button>
            </form>
          )}
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">Event signups</h2>
        {signups.length === 0 ? (
          <EmptyState title="No signups yet" hint="Sign this volunteer up for an event above to start tracking hours." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Hours</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => {
                  const eventDate = eventDateById.get(s.event_id);
                  const eventHasPassed = Boolean(eventDate && eventDate <= today);
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-ink">{s.event_name || `Event #${s.event_id}`}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

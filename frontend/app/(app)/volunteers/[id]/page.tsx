import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Trash2, CalendarPlus, Clock, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar, Badge, Button, Card, EmptyState, Input, Label, Select } from "@/components/ui";

const STATUS_VARIANT = {
  pending: "default",
  confirmed: "primary",
  rejected: "danger",
  attended: "accent",
  no_show: "danger",
} as const;

export default async function VolunteerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const volunteerId = Number(id);

  const [volunteer, signups, events] = await Promise.all([
    api.volunteers.get(volunteerId).catch(() => null),
    api.signups.list({ volunteerId }),
    api.events.list(),
  ]);

  if (!volunteer) notFound();

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
    await api.signups.apply({ event_id, volunteer_id: volunteerId, role: role || undefined });
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

      <section className="grid gap-6 sm:grid-cols-2">
        <Card>
          <span className="text-sm font-medium text-ink">Profile</span>
          <form action={updateVolunteer} className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label>Name</Label>
              <Input name="name" defaultValue={volunteer.name} required />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Email</Label>
              <Input name="email" defaultValue={volunteer.email ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Skills</Label>
              <Input name="skills" defaultValue={volunteer.skills ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Availability</Label>
              <Input name="availability" defaultValue={volunteer.availability ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Location</Label>
              <Input name="location" defaultValue={volunteer.location ?? ""} />
            </div>
            <Button type="submit" className="self-start">
              Save changes
            </Button>
          </form>
        </Card>

        <Card>
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <CalendarPlus size={14} className="text-primary" />
            Sign up for an event
          </span>
          <form action={addSignup} className="mt-3 flex flex-col gap-3">
            <Select name="event_id" required defaultValue="">
              <option value="">Select event</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.date})</option>
              ))}
            </Select>
            <Input name="role" placeholder="Role (optional)" />
            <Button type="submit" variant="accent" className="self-start">
              Sign up
            </Button>
          </form>
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
                {signups.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-ink">{s.event_name || `Event #${s.event_id}`}</td>
                    <td className="px-3 py-2 text-muted">{s.role || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_VARIANT[s.status]}>{s.status.replace("_", " ")}</Badge>
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
                      {s.status === "confirmed" && (
                        <form action={markAttended} className="flex items-center gap-1.5">
                          <input type="hidden" name="signup_id" value={s.id} />
                          <Input name="hours" type="number" step="0.5" min="0" placeholder="hrs" className="w-16 px-2 py-1 text-xs" />
                          <Button type="submit" size="sm">Mark attended</Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

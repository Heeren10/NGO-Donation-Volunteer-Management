import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Users, Clock, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar, Badge, Button, Card, EmptyState, Input, Label, PageHeader } from "@/components/ui";

export default async function VolunteersPage() {
  const volunteers = await api.volunteers.list();

  async function addVolunteer(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const skills = String(formData.get("skills") || "").trim();
    const location = String(formData.get("location") || "").trim();
    if (!name) return;
    await api.volunteers.create({
      name,
      email: email || undefined,
      skills: skills || undefined,
      location: location || undefined,
    });
    revalidatePath("/volunteers");
    revalidatePath("/");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
      <PageHeader icon={<Users size={18} />} title="Volunteers" subtitle={`${volunteers.length} volunteer${volunteers.length === 1 ? "" : "s"} registered`} />

      {volunteers.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="No volunteers yet" hint="Register your first volunteer below to start scheduling shifts." />
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {volunteers.map((v) => (
            <Link
              key={v.id}
              href={`/volunteers/${v.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2"
            >
              <Avatar name={v.name} />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-ink">{v.name}</span>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {v.skills && <span>{v.skills}</span>}
                  {v.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {v.location}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="primary">
                <Clock size={11} className="mr-1" />
                {v.total_hours} hrs
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <Card className="sm:max-w-sm">
        <span className="text-sm font-medium text-ink">Add volunteer</span>
        <form action={addVolunteer} className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label>Name</Label>
            <Input name="name" placeholder="Jane Doe" required />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Email</Label>
            <Input name="email" type="email" placeholder="Optional" />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Skills</Label>
            <Input name="skills" placeholder="first-aid, logistics" />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Location</Label>
            <Input name="location" placeholder="Optional" />
          </div>
          <Button type="submit" className="mt-1 self-start">
            Add volunteer
          </Button>
        </form>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { HeartHandshake, Repeat } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar, Badge, Button, Card, EmptyState, Input, Label, PageHeader } from "@/components/ui";

export default async function DonorsPage() {
  const donors = await api.donors.list();

  async function addDonor(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    if (!name) return;
    await api.donors.create({ name, email: email || undefined, phone: phone || undefined });
    revalidatePath("/donors");
    revalidatePath("/");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
      <PageHeader icon={<HeartHandshake size={18} />} title="Donors" subtitle={`${donors.length} supporter${donors.length === 1 ? "" : "s"} on file`} />

      {donors.length === 0 ? (
        <EmptyState icon={<HeartHandshake size={22} />} title="No donors yet" hint="Add your first supporter below to start tracking gifts and history." />
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {donors.map((d) => (
            <Link
              key={d.id}
              href={`/donors/${d.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2"
            >
              <Avatar name={d.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{d.name}</span>
                  {d.is_recurring && (
                    <Badge variant="accent">
                      <Repeat size={11} className="mr-1" />
                      recurring
                    </Badge>
                  )}
                </div>
                <div className="truncate text-xs text-muted">{d.email || "No email on file"}</div>
              </div>
              <div className="text-sm font-medium text-ink">₹{d.total_donated.toLocaleString()}</div>
            </Link>
          ))}
        </div>
      )}

      <Card className="sm:max-w-sm">
        <span className="text-sm font-medium text-ink">Add donor</span>
        <form action={addDonor} className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label>Name</Label>
            <Input name="name" placeholder="Jane Doe" required />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Email</Label>
            <Input name="email" type="email" placeholder="jane@example.com" />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Phone</Label>
            <Input name="phone" placeholder="Optional" />
          </div>
          <Button type="submit" className="mt-1 self-start">
            Add donor
          </Button>
        </form>
      </Card>
    </div>
  );
}

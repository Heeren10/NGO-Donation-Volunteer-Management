import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Mail, Trash2, Wallet, MessageSquareText } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar, Badge, Button, Card, EmptyState, Input, Label, Select, Textarea } from "@/components/ui";

export default async function DonorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donorId = Number(id);

  const [donor, donations, communications, campaigns] = await Promise.all([
    api.donors.get(donorId).catch(() => null),
    api.donations.list(donorId),
    api.communications.list({ donorId }),
    api.campaigns.list(),
  ]);

  if (!donor) notFound();

  async function updateDonor(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const is_recurring = formData.get("is_recurring") === "on";
    await api.donors.update(donorId, { name, email, phone, is_recurring });
    revalidatePath(`/donors/${donorId}`);
    revalidatePath("/donors");
  }

  async function deleteDonor() {
    "use server";
    await api.donors.remove(donorId);
    revalidatePath("/donors");
    revalidatePath("/");
    redirect("/donors");
  }

  async function addDonation(formData: FormData) {
    "use server";
    const amount = Number(formData.get("amount"));
    const campaign_id = Number(formData.get("campaign_id")) || undefined;
    if (!amount) return;
    await api.donations.create({ donor_id: donorId, campaign_id, amount });
    revalidatePath(`/donors/${donorId}`);
    revalidatePath("/donors");
    revalidatePath("/campaigns");
    revalidatePath("/");
  }

  async function sendComm(formData: FormData) {
    "use server";
    const content = String(formData.get("content") || "").trim();
    if (!content) return;
    await api.communications.create({ donor_id: donorId, channel: "email", content });
    revalidatePath(`/donors/${donorId}`);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={donor.name} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-ink">{donor.name}</h1>
              {donor.is_recurring && <Badge variant="accent">recurring</Badge>}
            </div>
            {donor.email && (
              <span className="flex items-center gap-1 text-sm text-muted">
                <Mail size={13} />
                {donor.email}
              </span>
            )}
          </div>
        </div>
        <form action={deleteDonor}>
          <Button type="submit" variant="danger" size="sm">
            <Trash2 size={13} />
            Delete
          </Button>
        </form>
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <Card>
          <span className="text-sm font-medium text-ink">Profile</span>
          <form action={updateDonor} className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label>Name</Label>
              <Input name="name" defaultValue={donor.name} required />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Email</Label>
              <Input name="email" defaultValue={donor.email ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Phone</Label>
              <Input name="phone" defaultValue={donor.phone ?? ""} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="is_recurring" defaultChecked={donor.is_recurring} className="accent-primary" />
              Recurring donor
            </label>
            <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span className="text-muted">Total donated </span>
              <span className="font-semibold text-ink">₹{donor.total_donated.toLocaleString()}</span>
              {donor.last_donation_date && <span className="text-muted"> · last gift {donor.last_donation_date}</span>}
            </div>
            <Button type="submit" className="self-start">
              Save changes
            </Button>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Wallet size={14} className="text-primary" />
              Record a donation
            </span>
            <form action={addDonation} className="mt-3 flex flex-col gap-3">
              <Select name="campaign_id" defaultValue="">
                <option value="">No campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Input name="amount" type="number" step="0.01" min="0" required placeholder="Amount" />
              <Button type="submit" variant="accent" className="self-start">
                Record donation
              </Button>
            </form>
          </Card>

          <Card>
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <MessageSquareText size={14} className="text-primary" />
              Send acknowledgment
            </span>
            <form action={sendComm} className="mt-3 flex flex-col gap-3">
              <Textarea name="content" rows={2} required placeholder="Thank you for..." />
              <Button type="submit" className="self-start">
                Send
              </Button>
            </form>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">Donation history</h2>
          {donations.length === 0 ? (
            <EmptyState title="No donations yet" hint="Gifts recorded for this donor will show up here." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-xs text-muted">
                  <tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Amount</th><th className="px-3 py-2 font-medium">Channel</th></tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className="px-3 py-2 text-muted">{d.date}</td>
                      <td className="px-3 py-2 font-medium text-ink">₹{d.amount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-muted capitalize">{d.channel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">Communication history</h2>
          {communications.length === 0 ? (
            <EmptyState title="No communications yet" hint="Acknowledgments and updates you send will be logged here." />
          ) : (
            <div className="flex flex-col gap-2">
              {communications.map((c) => (
                <Card key={c.id}>
                  <div className="text-xs text-muted capitalize">{c.channel} · {new Date(c.sent_at).toLocaleString()}</div>
                  <div className="mt-0.5 text-sm text-ink">{c.content}</div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

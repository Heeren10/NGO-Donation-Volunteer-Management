import { type ReactNode, type CSSProperties } from "react";
import { LayoutDashboard, Wallet, Users, HeartHandshake, Megaphone, TriangleAlert, Target } from "lucide-react";
import { api } from "@/lib/api";
import DonationsOverTimeChart from "@/components/charts/DonationsOverTimeChart";
import TopDonorsChart from "@/components/charts/TopDonorsChart";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";

export default async function Dashboard() {
  const s = await api.analytics.summary();
  const goalPct = s.total_goal > 0 ? Math.min(100, (s.total_raised / s.total_goal) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8 sm:px-8">
      <PageHeader icon={<LayoutDashboard size={18} />} title="Analytics Dashboard" subtitle="Live snapshot across every campaign, donor, and volunteer" />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card
          hover
          glow="primary"
          fill="primary"
          className="animate-fade-up sm:col-span-3 sm:row-span-1"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground/75">
                <Wallet size={14} />
                Total Raised
              </div>
              <div className="mt-1 text-4xl font-semibold tracking-tight">
                <AnimatedNumber value={s.total_raised} prefix="₹" />
              </div>
              <div className="mt-1 text-xs text-primary-foreground/75">of ₹{s.total_goal.toLocaleString()} combined goal</div>
            </div>
            <div className="flex min-w-40 flex-1 flex-col gap-1.5 sm:max-w-52">
              <div className="flex items-center justify-between text-xs text-primary-foreground/75">
                <span className="flex items-center gap-1"><Target size={12} />Progress</span>
                <span className="font-medium text-primary-foreground">{goalPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary-foreground/20">
                <div className="h-full rounded-full bg-primary-foreground transition-[width] duration-700 ease-out" style={{ width: `${goalPct}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <StatCard icon={<HeartHandshake size={16} />} tone="accent" label="Donors" value={s.donor_count} delay={60} />
        <StatCard icon={<Users size={16} />} tone="accent" label="Volunteers" value={s.volunteer_count} sub={`${s.volunteer_hours_total} hrs logged`} delay={120} />
        <StatCard icon={<Megaphone size={16} />} tone="gold" label="Campaigns" value={s.campaign_count} sub={`${s.event_count} events`} delay={180} />
      </section>

      {s.lapsed_donors_count > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm animate-fade-up">
          <TriangleAlert size={16} className="shrink-0 text-warning-foreground" />
          <span>
            <span className="font-medium text-ink">{s.lapsed_donors_count} lapsed donor{s.lapsed_donors_count === 1 ? "" : "s"}</span>
            <span className="text-muted"> — no donation in the last 90 days</span>
          </span>
        </div>
      )}

      <section className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-medium text-ink">Donations over time</h2>
          <DonationsOverTimeChart data={s.donations_by_month} />
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-medium text-ink">Top donors</h2>
          <TopDonorsChart data={s.top_donors} />
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Campaign performance</h2>
        <div className="flex flex-col gap-3">
          {s.campaigns.length === 0 && <EmptyState title="No campaigns yet" hint="Create a campaign to start tracking fundraising progress." />}
          {s.campaigns.map((c) => {
            const pct = c.goal_amount > 0 ? (c.raised_amount / c.goal_amount) * 100 : 0;
            return (
              <Card key={c.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="text-muted">
                    ₹{c.raised_amount.toLocaleString()} / ₹{c.goal_amount.toLocaleString()} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="mt-2.5">
                  <ProgressBar pct={pct} />
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const statTone = {
  accent: { icon: "text-accent-text", chip: "bg-accent/12" },
  gold: { icon: "text-gold-text", chip: "bg-gold/16" },
  primary: { icon: "text-primary-text", chip: "bg-primary/12" },
};

function StatCard({
  icon,
  label,
  value,
  prefix,
  sub,
  delay,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  prefix?: string;
  sub?: string;
  delay: number;
  tone?: keyof typeof statTone;
}) {
  const t = statTone[tone];
  return (
    <Card hover className="animate-fade-up" style={{ animationDelay: `${delay}ms` } as CSSProperties}>
      <div className="flex items-center gap-2">
        <span className={cx("flex h-7 w-7 items-center justify-center rounded-md", t.chip, t.icon)}>{icon}</span>
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        <AnimatedNumber value={value} prefix={prefix} />
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

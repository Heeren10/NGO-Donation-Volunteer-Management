import {
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Shared across every page that renders a signup's status (my/, volunteers/[id], events/[id]). */
export const SIGNUP_STATUS_VARIANT = {
  pending: "default",
  confirmed: "primary",
  rejected: "danger",
  attended: "accent",
  no_show: "danger",
} as const;

/** Shared across every page that labels an event's category (my/, events/). */
export const EVENT_CATEGORY_LABELS = {
  fundraising: "Fundraising",
  awareness: "Awareness",
  community_drive: "Community Drive",
  workshop: "Workshop",
  training: "Training",
  charity_campaign: "Charity Campaign",
} as const;

/** Shared across every page that labels a campaign's category (campaigns/, campaigns/[id]). */
export const CAMPAIGN_CATEGORY_LABELS = {
  education: "Education",
  healthcare: "Healthcare",
  environment: "Environment",
  animal_welfare: "Animal Welfare",
  disaster_relief: "Disaster Relief",
  womens_empowerment: "Women's Empowerment",
  community_development: "Community Development",
  child_welfare: "Child Welfare",
} as const;

/** Faint dot-grid background, used behind hero/brand panels. `id` must be unique if more than one is on screen at once. */
export function DotGrid({ id = "dot-grid", opacity = 0.12 }: { id?: string; opacity?: number }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }} aria-hidden>
      <pattern id={id} x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.6" fill="currentColor" />
      </pattern>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Shared two-column shell for login/register: branded pitch panel + centered form. */
export function AuthLayout({
  heroTitle,
  heroSubtitle,
  children,
}: {
  heroTitle: ReactNode;
  heroSubtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen sm:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground sm:flex">
        <DotGrid id="auth-dots" />
        <Link href="/" className="relative flex items-center gap-1.5 text-sm font-semibold hover:opacity-90">
          <Sparkles size={16} strokeWidth={2.5} />
          NGO Platform
        </Link>
        <div className="relative flex flex-col gap-2 animate-fade-up" style={{ animationDelay: "40ms" }}>
          <h1 className="max-w-sm text-3xl font-semibold tracking-tight text-balance">{heroTitle}</h1>
          <p className="max-w-sm text-sm text-primary-foreground/80">{heroSubtitle}</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}

const buttonVariants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25",
  accent: "bg-accent text-accent-foreground hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25",
  secondary: "border border-border bg-surface text-ink hover:bg-surface-2 hover:shadow-sm",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "border border-danger/30 text-danger-text hover:bg-danger/10",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants; size?: "sm" | "md" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:hover:shadow-none",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus-visible:border-primary",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus-visible:border-primary",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-ink transition-colors duration-150 focus-visible:border-primary",
        className
      )}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium text-muted">{children}</label>;
}

const cardHoverTone = {
  neutral: "hover:shadow-ink/8",
  primary: "hover:shadow-primary/15",
  accent: "hover:shadow-accent/15",
};

const cardFill = {
  surface: "border-border bg-surface",
  primary: "border-transparent bg-primary text-primary-foreground",
  accent: "border-transparent bg-accent text-accent-foreground",
};

export function Card({
  className,
  children,
  hover = false,
  glow = "neutral",
  fill = "surface",
  style,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  glow?: keyof typeof cardHoverTone;
  fill?: keyof typeof cardFill;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cx(
        "rounded-xl border p-4",
        cardFill[fill],
        hover && `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${cardHoverTone[glow]}`,
        className
      )}
    >
      {children}
    </div>
  );
}

const badgeVariants = {
  default: "bg-surface-2 text-muted",
  primary: "bg-primary/12 text-primary-text",
  accent: "bg-accent/14 text-accent-text",
  gold: "bg-gold/16 text-gold-text",
  warning: "bg-warning/16 text-warning-foreground",
  danger: "bg-danger/12 text-danger-text",
};

export function Badge({ variant = "default", children }: { variant?: keyof typeof badgeVariants; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", badgeVariants[variant])}>
      {children}
    </span>
  );
}

export function PageHeader({ icon, title, subtitle, action }: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary">{icon}</span>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      {icon && <span className="text-muted">{icon}</span>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "primary" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={cx("h-full rounded-full transition-[width] duration-500 ease-out", tone === "accent" ? "bg-accent" : "bg-primary")}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
      {initials}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

/** Circular progress ring — used for the volunteer-hours visual on /my. */
export function ProgressRing({
  pct,
  size = 88,
  strokeWidth = 8,
  tone = "gold",
  children,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  tone?: "gold" | "accent" | "primary";
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circumference * (1 - clamped / 100);
  const toneClass = tone === "gold" ? "text-gold" : tone === "accent" ? "text-accent" : "text-primary";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="fill-none stroke-surface-2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cx("animate-ring fill-none", toneClass)}
          stroke="currentColor"
          strokeDasharray={circumference}
          style={{ "--ring-circumference": circumference, "--ring-offset": offset } as CSSProperties}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

import "server-only";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type CampaignCategory =
  | "education" | "healthcare" | "environment" | "animal_welfare"
  | "disaster_relief" | "womens_empowerment" | "community_development" | "child_welfare";

export type EventCategory =
  | "fundraising" | "awareness" | "community_drive" | "workshop" | "training" | "charity_campaign";

export type Donor = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string | null;
  is_recurring: boolean;
  total_donated: number;
  last_donation_date: string | null;
};

export type Campaign = {
  id: number;
  name: string;
  goal_amount: number;
  start_date: string;
  end_date: string | null;
  status: "draft" | "active" | "completed";
  category: CampaignCategory | null;
  raised_amount: number;
};

export type Volunteer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  skills: string | null;
  availability: string | null;
  location: string | null;
  total_hours: number;
};

export type EventItem = {
  id: number;
  name: string;
  date: string;
  location: string | null;
  campaign_id: number | null;
  category: EventCategory | null;
  roles_needed: string | null;
  outcome_notes: string | null;
};

export type Donation = {
  id: number;
  donor_id: number;
  campaign_id: number | null;
  amount: number;
  date: string;
  channel: "online" | "offline";
  method: string | null;
  recurring: boolean;
};

export type Signup = {
  id: number;
  event_id: number;
  volunteer_id: number;
  role: string | null;
  status: "pending" | "confirmed" | "rejected" | "attended" | "no_show";
  hours_logged: number;
  event_name: string | null;
  volunteer_name: string | null;
};

export type VolunteerSuggestion = {
  volunteer_id: number;
  name: string;
  score: number;
  matched_skills: string[];
};

export type Communication = {
  id: number;
  donor_id: number | null;
  volunteer_id: number | null;
  channel: "email" | "sms";
  content: string;
  sent_at: string;
};

export type AnalyticsSummary = {
  total_raised: number;
  total_goal: number;
  donor_count: number;
  volunteer_count: number;
  campaign_count: number;
  event_count: number;
  volunteer_hours_total: number;
  lapsed_donors_count: number;
  donations_by_month: { month: string; amount: number }[];
  campaigns: { id: number; name: string; goal_amount: number; raised_amount: number }[];
  top_donors: { id: number; name: string; total_donated: number }[];
};

export type AuthToken = { access_token: string; role: "admin" | "volunteer"; profile_id: number };
export type Me = { id: number; name: string; email: string; role: "admin" | "volunteer"; volunteer_id: number | null };

export type PaymentMethod = "card" | "upi" | "netbanking";

export type DonationReceipt = {
  reference: string;
  donor_name: string;
  amount: number;
  campaign_name: string | null;
  date: string;
};

const REQUEST_TIMEOUT_MS = 10_000;

async function request<T>(path: string, options?: RequestInit & { skipAuthRedirect?: boolean }): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(`Request to ${path} timed out after ${REQUEST_TIMEOUT_MS / 1000}s — is the backend running?`);
    }
    throw new Error(`Could not reach the backend at ${API_URL}${path} — is it running? (${(err as Error).message})`);
  }
  if (res.status === 401 && !options?.skipAuthRedirect) redirect("/login");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string; skills?: string; availability?: string; location?: string }) =>
      request<AuthToken>("/auth/register", { method: "POST", body: JSON.stringify(data), skipAuthRedirect: true }),
    login: (data: { email: string; password: string }) =>
      request<AuthToken>("/auth/login", { method: "POST", body: JSON.stringify(data), skipAuthRedirect: true }),
    me: () => request<Me>("/auth/me"),
  },
  donors: {
    list: () => request<Donor[]>("/donors/"),
    get: (id: number) => request<Donor>(`/donors/${id}`),
    create: (data: { name: string; email?: string; phone?: string; tags?: string; is_recurring?: boolean }) =>
      request<Donor>("/donors/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ name: string; email: string; phone: string; tags: string; is_recurring: boolean }>) =>
      request<Donor>(`/donors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/donors/${id}`, { method: "DELETE" }),
  },
  campaigns: {
    list: () => request<Campaign[]>("/campaigns/"),
    get: (id: number) => request<Campaign>(`/campaigns/${id}`),
    create: (data: { name: string; goal_amount: number; start_date: string; end_date?: string; category?: CampaignCategory }) =>
      request<Campaign>("/campaigns/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ name: string; goal_amount: number; start_date: string; end_date: string; status: Campaign["status"]; category: CampaignCategory }>) =>
      request<Campaign>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/campaigns/${id}`, { method: "DELETE" }),
  },
  volunteers: {
    list: () => request<Volunteer[]>("/volunteers/"),
    get: (id: number) => request<Volunteer>(`/volunteers/${id}`),
    create: (data: { name: string; email?: string; phone?: string; skills?: string; availability?: string; location?: string }) =>
      request<Volunteer>("/volunteers/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ name: string; email: string; phone: string; skills: string; availability: string; location: string }>) =>
      request<Volunteer>(`/volunteers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/volunteers/${id}`, { method: "DELETE" }),
  },
  events: {
    list: () => request<EventItem[]>("/events/"),
    get: (id: number) => request<EventItem>(`/events/${id}`),
    create: (data: { name: string; date: string; location?: string; campaign_id?: number; category?: EventCategory; roles_needed?: string }) =>
      request<EventItem>("/events/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ name: string; date: string; location: string; campaign_id: number; category: EventCategory; roles_needed: string; outcome_notes: string }>) =>
      request<EventItem>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/events/${id}`, { method: "DELETE" }),
    suggestedVolunteers: (id: number) => request<VolunteerSuggestion[]>(`/events/${id}/suggested-volunteers`),
  },
  donations: {
    list: (donorId?: number) => request<Donation[]>(`/donations/${donorId ? `?donor_id=${donorId}` : ""}`),
    create: (data: { donor_id: number; campaign_id?: number; amount: number }) =>
      request<Donation>("/donations/", { method: "POST", body: JSON.stringify(data) }),
  },
  signups: {
    list: (params: { volunteerId?: number; eventId?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.volunteerId) q.set("volunteer_id", String(params.volunteerId));
      if (params.eventId) q.set("event_id", String(params.eventId));
      const qs = q.toString();
      return request<Signup[]>(`/signups/${qs ? `?${qs}` : ""}`);
    },
    apply: (data: { event_id: number; role?: string; volunteer_id?: number }) =>
      request<Signup>("/signups/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ status: Signup["status"]; hours_logged: number }>) =>
      request<Signup>(`/signups/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  communications: {
    list: (params: { donorId?: number; volunteerId?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.donorId) q.set("donor_id", String(params.donorId));
      if (params.volunteerId) q.set("volunteer_id", String(params.volunteerId));
      const qs = q.toString();
      return request<Communication[]>(`/communications/${qs ? `?${qs}` : ""}`);
    },
    create: (data: { donor_id?: number; volunteer_id?: number; channel: "email" | "sms"; content: string }) =>
      request<Communication>("/communications/", { method: "POST", body: JSON.stringify(data) }),
  },
  analytics: {
    summary: () => request<AnalyticsSummary>("/analytics/summary"),
  },
  public: {
    campaigns: () => request<Campaign[]>("/public/campaigns", { skipAuthRedirect: true }),
    donate: (data: { name: string; email?: string; phone?: string; campaign_id?: number; amount: number; method: PaymentMethod }) =>
      request<DonationReceipt>("/public/donate", { method: "POST", body: JSON.stringify(data), skipAuthRedirect: true }),
  },
};

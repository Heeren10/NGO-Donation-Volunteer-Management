import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FileText, Sparkles, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Markdown } from "@/components/ui/Markdown";
import { PrintButton } from "@/components/ui/PrintButton";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function GrantProposalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const proposal = await api.grants.latest().catch(() => null);

  async function generateProposal() {
    "use server";
    try {
      await api.grants.generate();
    } catch {
      redirect("/grants?error=1");
    }
    revalidatePath("/grants");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8 sm:px-8">
      <PageHeader
        icon={<FileText size={18} />}
        title="Grant Proposal Generator"
        subtitle="Turns your real track record — funds raised, campaigns, volunteer hours — into a submission-ready draft."
        action={
          <form action={generateProposal}>
            <SubmitButton variant="accent" pendingText="Generating… (can take up to 90s)">
              <Sparkles size={14} />
              {proposal ? "Regenerate" : "Generate proposal"}
            </SubmitButton>
          </form>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-text print:hidden">
          <TriangleAlert size={14} className="shrink-0" />
          Couldn&apos;t generate a proposal right now — the AI provider may be unavailable. Try again shortly.
        </div>
      )}

      {!proposal ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="No proposal generated yet"
          hint="Click Generate proposal above — it reads your campaigns, donations, and volunteer records directly."
        />
      ) : (
        <>
          <div className="flex items-center justify-between print:hidden">
            <span className="text-xs text-muted">Generated {new Date(proposal.generated_at).toLocaleString()}</span>
            <PrintButton />
          </div>
          <Card className="print-surface">
            <Markdown content={proposal.generated_content} />
          </Card>
        </>
      )}
    </div>
  );
}

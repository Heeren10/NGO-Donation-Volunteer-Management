import { Skeleton, Card } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8 sm:px-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-3">
          <Skeleton className="h-24 w-full" />
        </Card>
        <Card><Skeleton className="h-16 w-full" /></Card>
        <Card><Skeleton className="h-16 w-full" /></Card>
        <Card><Skeleton className="h-16 w-full" /></Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card><Skeleton className="h-56 w-full" /></Card>
        <Card><Skeleton className="h-56 w-full" /></Card>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Card><Skeleton className="h-12 w-full" /></Card>
      </div>
    </div>
  );
}

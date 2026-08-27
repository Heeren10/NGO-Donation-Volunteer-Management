import { Card, Skeleton } from "@/components/ui";

export default function MyDashboardLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8 sm:px-8">
      <Card>
        <Skeleton className="h-28 w-full" />
      </Card>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card><Skeleton className="h-64 w-full" /></Card>
        <Card><Skeleton className="h-64 w-full" /></Card>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card><Skeleton className="h-20 w-full" /></Card>
          <Card><Skeleton className="h-20 w-full" /></Card>
        </div>
      </div>
    </div>
  );
}

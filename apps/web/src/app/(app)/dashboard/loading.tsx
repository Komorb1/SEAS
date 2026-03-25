import { PageLoadingState } from "@/components/ui/page-states";

export default function Loading() {
  return (
    <PageLoadingState
      title="Loading dashboard"
      description="Please wait while we fetch your latest sites, devices, and activity."
    />
  );
}
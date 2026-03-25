import { PageLoadingState } from "@/components/ui/page-states";

export default function Loading() {
  return (
    <PageLoadingState
      title="Loading alerts"
      description="Please wait while we fetch the latest alerts."
    />
  );
}
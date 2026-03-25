import { PageLoadingState } from "@/components/ui/page-states";

export default function Loading() {
  return (
    <PageLoadingState
      title="Loading activity"
      description="Please wait while we fetch your recent audit activity."
    />
  );
}
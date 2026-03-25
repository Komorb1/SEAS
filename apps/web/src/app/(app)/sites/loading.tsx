import { PageLoadingState } from "@/components/ui/page-states";

export default function Loading() {
  return (
    <PageLoadingState
      title="Loading sites"
      description="Please wait while we fetch your monitored locations."
    />
  );
}
import { PageLoadingState } from "@/components/ui/page-states";

export default function Loading() {
  return (
    <PageLoadingState
      title="Loading devices"
      description="Please wait while we fetch your registered devices."
    />
  );
}
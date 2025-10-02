import { EmptyState } from "@/components/empty-state";

export const ProcessingState = () => {
  return (
    <div className="bg-white rouded-lg px-4 py-5 flex flex-col gap-y-8 itmes-center justify-center">
      <EmptyState
        image="/processing.svg"
        title="Meeting completed"
        description="This meeting was completed, a summary will appear soon"
      />
    </div>
  );
};

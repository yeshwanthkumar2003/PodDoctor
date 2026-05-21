import { TopologyCard } from "../topology/TopologyCard";
import { MetricsRow } from "../metrics/MetricsRow";

export function CenterColumn() {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <TopologyCard />
      <MetricsRow />
    </main>
  );
}

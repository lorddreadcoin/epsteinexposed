import { NeuralGraph } from './components/graph/NeuralGraph';
import { SystemStatus } from './components/dashboard/SystemStatus';
import { AnomalyStream } from './components/dashboard/AnomalyStream';
import { SearchPanel } from './components/search/SearchPanel';

export default function Home() {
  return (
    <main className="relative">
      <NeuralGraph />
      <SystemStatus />
      <AnomalyStream />
      <SearchPanel />
    </main>
  );
}

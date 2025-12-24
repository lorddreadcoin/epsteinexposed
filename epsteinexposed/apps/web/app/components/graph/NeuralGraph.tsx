'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const Graph3D = dynamic(
  () => import('./Graph3DCore').then(mod => ({ default: mod.Graph3DCore })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-primary text-xl animate-pulse">
          Initializing neural graph...
        </div>
      </div>
    )
  }
);

export function NeuralGraph() {
  return (
    <Suspense fallback={<div className="h-screen bg-black" />}>
      <Graph3D />
    </Suspense>
  );
}

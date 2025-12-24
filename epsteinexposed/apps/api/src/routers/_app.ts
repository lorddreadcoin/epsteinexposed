import { router } from '../trpc';
import { graphRouter } from './graph.router';
import { documentRouter } from './document.router';

export const appRouter = router({
  graph: graphRouter,
  document: documentRouter,
});

export type AppRouter = typeof appRouter;

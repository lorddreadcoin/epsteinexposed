# Epstein Exposed - Autonomous Investigation Interface

A cinematic, zero-friction investigation platform where AI agents autonomously discover connections in real-time while delivering flawless 60fps 3D visualization.

## Features

- **3D Neural Graph** - Interactive force-directed graph visualization using Three.js + React Three Fiber
- **Real-time Anomaly Stream** - Live feed of AI-discovered patterns, contradictions, and connections
- **Entity Network** - Visual mapping of persons, locations, events, documents, flights, and transactions
- **System Metrics** - Live dashboard showing document processing progress and agent status
- **Node Detail Panel** - Click any entity for detailed information and connections

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **3D Graphics**: Three.js + React Three Fiber + Drei
- **Animation**: Framer Motion
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the investigation interface.

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main investigation interface
│   ├── layout.tsx         # Root layout with fonts
│   └── globals.css        # Dark cinematic theme
├── components/
│   ├── graph/             # 3D Neural Graph visualization
│   ├── anomaly/           # Anomaly Stream feed
│   ├── metrics/           # System status dashboard
│   └── panel/             # Node detail panel
└── lib/
    ├── store/             # Zustand state management
    ├── types/             # TypeScript definitions
    ├── utils/             # Graph physics utilities
    └── mock-data.ts       # Demo data for visualization
```

## Environment Variables

For production with real AI agents, you'll need:

```env
ANTHROPIC_API_KEY=         # Claude API for analysis
NEO4J_URI=                 # Graph database
NEO4J_USER=
NEO4J_PASSWORD=
QDRANT_URL=                # Vector database for semantic search
```

## Roadmap

- [ ] Backend API with tRPC
- [ ] Real AI agent integration (Claude Sonnet/Haiku)
- [ ] Document ingestion pipeline
- [ ] WebSocket real-time updates
- [ ] Timeline scroll view
- [ ] Document viewer with redaction visualization
- [ ] OSINT integration

## License

Private - All rights reserved

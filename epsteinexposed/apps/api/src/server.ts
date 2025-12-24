import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/_app';
import { DocumentMapperService } from './services/document-mapper.service';

const app = express();

app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PDF serving route - serves actual PDF documents
app.get('/pdf/:documentId', async (req, res) => {
  try {
    const mapper = new DocumentMapperService();
    const docPath = await mapper.getDocumentPath(req.params.documentId);
    
    if (docPath && fs.existsSync(docPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(docPath)}"`);
      res.sendFile(docPath);
    } else {
      // Try to find the PDF directly in the web folder
      const webPath = path.join(__dirname, '../../web');
      const possiblePaths = [
        path.join(webPath, req.params.documentId),
        path.join(webPath, `${req.params.documentId}.pdf`),
      ];
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          res.setHeader('Content-Type', 'application/pdf');
          res.sendFile(p);
          return;
        }
      }
      
      res.status(404).json({ error: 'Document not found', documentId: req.params.documentId });
    }
  } catch (error) {
    console.error('PDF serving error:', error);
    res.status(500).json({ error: 'Failed to load document' });
  }
});

// tRPC endpoint
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
}));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ═══════════════════════════════════════════════════════');
  console.log('   EPSTEIN EXPOSED API SERVER');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   📡 Server running on http://localhost:${PORT}`);
  console.log(`   🔗 tRPC endpoint: http://localhost:${PORT}/trpc`);
  console.log(`   📄 PDF endpoint: http://localhost:${PORT}/pdf/:documentId`);
  console.log('');
  console.log('   Available endpoints:');
  console.log('   • graph.getGraph - Get 3D visualization data');
  console.log('   • graph.getMetrics - Get system metrics');
  console.log('   • graph.getDiscoveries - Get AI discoveries');
  console.log('   • graph.getNodeDetails - Get entity details');
  console.log('   • document.getEntityDocuments - Get docs for entity');
  console.log('   • document.getConnectionDocuments - Get evidence docs');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

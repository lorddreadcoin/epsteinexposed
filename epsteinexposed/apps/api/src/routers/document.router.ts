import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { DocumentMapperService } from '../services/document-mapper.service';

const docMapper = new DocumentMapperService();

export const documentRouter = router({
  
  // Get all documents where an entity appears
  getEntityDocuments: publicProcedure
    .input(z.object({ entityName: z.string() }))
    .query(async ({ input }) => {
      const docs = await docMapper.getDocumentsForEntity(input.entityName);
      return docs;
    }),
  
  // Get documents where TWO entities appear together (proof of connection)
  getConnectionDocuments: publicProcedure
    .input(z.object({ 
      entity1: z.string(),
      entity2: z.string(),
    }))
    .query(async ({ input }) => {
      const docs = await docMapper.getDocumentsForConnection(
        input.entity1,
        input.entity2
      );
      return docs;
    }),
  
  // Get document details by ID
  getDocumentById: publicProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      const doc = await docMapper.getDocumentById(input.documentId);
      return doc;
    }),
  
  // Get the file path for a document (for PDF serving)
  getDocumentPath: publicProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      const path = await docMapper.getDocumentPath(input.documentId);
      return { path };
    }),
  
  // Get all entities extracted from a document
  getDocumentEntities: publicProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      const entities = await docMapper.getDocumentEntities(input.documentId);
      return entities;
    }),
});

import 'pdf-parse/worker';
import type { ChromaClient } from 'chromadb';
import type { GoogleGeminiEmbeddingFunction } from '@chroma-core/google-gemini';

let chromaClient: ChromaClient | null = null;
let embeddingFunction: GoogleGeminiEmbeddingFunction | null = null;

export async function getOrCreateCollection(name: string) {
  try {
    // Lazy import to avoid module resolution issues
    const { ChromaClient } = await import('chromadb');
    const { GoogleGeminiEmbeddingFunction } = await import('@chroma-core/google-gemini');

    if (!chromaClient) {
      // Use Chroma Cloud if credentials are available, otherwise local
      if (process.env.CHROMA_API_KEY && process.env.CHROMA_TENANT) {
        const cloudHost = `${process.env.CHROMA_TENANT}.chroma.cloud`;
        chromaClient = new ChromaClient({
          ssl: true,
          host: cloudHost,
          port: 443,
          headers: {
            "Authorization": `Bearer ${process.env.CHROMA_API_KEY}`,
          },
          tenant: process.env.CHROMA_TENANT,
          database: process.env.CHROMA_DATABASE || "vps-gcp"
        });
      } else {
        // Local ChromaDB setup
        const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
        const url = new URL(chromaUrl);
        chromaClient = new ChromaClient({
          ssl: url.protocol === 'https:',
          host: url.hostname,
          port: parseInt(url.port, 10) || (url.protocol === 'https:' ? 443 : 8000)
        });
      }

      // Test connection before proceeding
      try {
        await chromaClient.heartbeat();
        console.log('✅ ChromaDB connection established');
      } catch (heartbeatError) {
        console.error('❌ ChromaDB connection failed:', heartbeatError);
        throw new Error(`Cannot connect to ChromaDB at ${process.env.CHROMA_URL || "http://localhost:8000"}. Please ensure ChromaDB is running.`);
      }
    }

    if (!embeddingFunction) {
      // Use Google Gemini for embeddings
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is required for ChromaDB embeddings');
      }

      try {
        embeddingFunction = new GoogleGeminiEmbeddingFunction({
          apiKey: process.env.GEMINI_API_KEY,
        });
        console.log('✅ Gemini embedding function initialized');
      } catch (error) {
        console.error('❌ Error creating Gemini embedding function:', error);
        throw new Error('Failed to initialize Gemini embedding function. Please check your GEMINI_API_KEY.');
      }
    }

    try {
      // Try to get existing collection
      const collection = await chromaClient.getCollection({
        name,
        embeddingFunction: embeddingFunction
      });
      return collection;
    } catch (_error) {
      // Collection doesn't exist, create it
      const collection = await chromaClient.createCollection({
        name,
        embeddingFunction: embeddingFunction
      });
      console.log(`✅ Created new ChromaDB collection: ${name}`);
      return collection;
    }
  } catch (error) {
    // Add context to the error
    if (error instanceof Error) {
      throw new Error(`ChromaDB initialization failed: ${error.message}`);
    }
    throw error;
  }
}
import 'pdf-parse/worker';
let chromaClient: any = null;
let embeddingFunction: any = null;

export async function getOrCreateCollection(name: string) {
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
        port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 8000)
      });
    }
  }

  if (!embeddingFunction) {
    // Use Google Gemini for embeddings
    try {
      embeddingFunction = new GoogleGeminiEmbeddingFunction({
        apiKey: process.env.GEMINI_API_KEY || "",
      });
    } catch (error) {
      console.error('Error creating Gemini embedding function:', error);
      throw error;
    }
  }

  try {
    // Try to get existing collection
    const collection = await chromaClient.getCollection({
      name,
      embeddingFunction: embeddingFunction
    });
    return collection;
  } catch (error) {
    // Collection doesn't exist, create it
    const collection = await chromaClient.createCollection({
      name,
      embeddingFunction: embeddingFunction
    });
    return collection;
  }
}
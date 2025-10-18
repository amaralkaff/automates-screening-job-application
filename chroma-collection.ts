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
      chromaClient = new ChromaClient({
        path: `https://${process.env.CHROMA_TENANT}.chroma.cloud`,
        auth: {
          provider: "chromadb",
          credentials: process.env.CHROMA_API_KEY,
        },
        tenant: process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE || "vps-gcp"
      });
    } else {
      chromaClient = new ChromaClient({
        path: process.env.CHROMA_URL || "http://localhost:8000"
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
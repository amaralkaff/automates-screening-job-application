import { CloudClient } from "chromadb";
import { GoogleGeminiEmbeddingFunction } from "@chroma-core/google-gemini";

const client = new CloudClient({
    apiKey: process.env.CHROMA_API_KEY,
    tenant: process.env.CHROMA_TENANT,
    database: process.env.CHROMA_DATABASE,
  });

// Create embedding function with proper configuration
const embedder = new GoogleGeminiEmbeddingFunction({
  apiKey: process.env.GEMINI_API_KEY!,
});

const getOrCreateCollection = async (collectionName: string) => {
    const collection = await client.getOrCreateCollection({
        name: collectionName,
        embeddingFunction: embedder,
    });
    return collection;
};

export { getOrCreateCollection, embedder };
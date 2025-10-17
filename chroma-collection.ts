import { ChromaClient } from "chromadb";
import { GoogleGeminiEmbeddingFunction } from "@chroma-core/google-gemini";

const client = new ChromaClient();

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
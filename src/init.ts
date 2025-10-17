import { DocumentProcessor } from './services/document-processor';

async function initializeSystem() {
  try {
    // Check if ChromaDB credentials are available
    if (!process.env.CHROMA_API_KEY || !process.env.CHROMA_TENANT || !process.env.GEMINI_API_KEY) {
      console.log('⚠️  ChromaDB or Gemini credentials not provided. Skipping reference document ingestion.');
      console.log('   To enable full functionality, set CHROMA_API_KEY, CHROMA_TENANT, and GEMINI_API_KEY in your .env file.');
      return;
    }

    const documentProcessor = new DocumentProcessor();
    await documentProcessor.ingestReferenceDocuments();
    console.log('Reference documents loaded');
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    console.log('⚠️  Server will continue with limited functionality. Please check your ChromaDB and Gemini credentials.');
    // Don't exit, allow server to continue with limited functionality
  }
}

// Run initialization if this file is executed directly
if (import.meta.main) {
  initializeSystem();
}

export { initializeSystem };
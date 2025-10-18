import { DocumentProcessor } from './services/document-processor';

async function initializeSystem() {
  try {
    // Check if Gemini API key is available (required for both cloud and local)
    if (!process.env.GEMINI_API_KEY) {
      console.log('   To enable full functionality, set GEMINI_API_KEY in your .env file.');
      return;
    }

    // Check if ChromaDB is configured (either cloud or local)
    const hasCloudConfig = process.env.CHROMA_API_KEY && process.env.CHROMA_TENANT;
    const hasLocalConfig = process.env.CHROMA_URL || true; // Local is default
    
    if (!hasCloudConfig && !hasLocalConfig) {
      console.log('   For local: ensure ChromaDB is running on http://localhost:8000 or set CHROMA_URL');
      return;
    }

    const documentProcessor = new DocumentProcessor();
    await documentProcessor.ingestReferenceDocuments();
    console.log('Reference documents loaded');
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    // Don't exit, allow server to continue with limited functionality
  }
}

// Run initialization if this file is executed directly
if (import.meta.main) {
  initializeSystem();
}

export { initializeSystem };
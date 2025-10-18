import { DocumentProcessor } from './core/services/document-processor';
import { config } from './config';

async function initializeSystem() {
  try {
    // Check if Gemini API key is available (required for evaluation)
    if (!config.env.GEMINI_API_KEY) {
      console.log('⚠️  GEMINI_API_KEY not set. To enable full functionality, set GEMINI_API_KEY in your environment.');
      return;
    }

    console.log('✅ Gemini API configured and ready');

    // Initialize ChromaDB and load reference documents
    try {
      const documentProcessor = new DocumentProcessor();
      await documentProcessor.ingestReferenceDocuments();
      console.log('✅ ChromaDB initialized successfully');
      console.log('✅ Reference documents loaded into vector database');
    } catch (chromaError) {
      console.error('❌ ChromaDB initialization failed:', chromaError);
      console.log('⚠️  Continuing without vector database - evaluation will be limited');
      console.log('   To use ChromaDB, ensure it is running on http://localhost:8000');
      console.log('   Or run: docker-compose up chromadb');
    }
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
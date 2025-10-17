import { DocumentProcessor } from './services/document-processor';

async function initializeSystem() {
  try {
    const documentProcessor = new DocumentProcessor();
    await documentProcessor.ingestReferenceDocuments();
    console.log('Reference documents loaded');
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if this file is executed directly
if (import.meta.main) {
  initializeSystem();
}

export { initializeSystem };
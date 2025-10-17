import { DocumentProcessor } from './services/document-processor';

async function initializeSystem() {
  console.log('🚀 Initializing AI CV Evaluation System...');

  try {
    const documentProcessor = new DocumentProcessor();

    console.log('📚 Ingesting reference documents...');
    await documentProcessor.ingestReferenceDocuments();

    console.log('✅ System initialization complete!');
    console.log('📋 Reference documents loaded:');
    console.log('   - Job Description (Backend Product Engineer)');
    console.log('   - Case Study Brief');
    console.log('   - CV Scoring Rubric');
    console.log('   - Project Scoring Rubric');

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
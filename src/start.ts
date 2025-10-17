import { initializeSystem } from './init';
import './server';

async function startServer() {
  console.log('🔄 Starting AI CV Evaluation Server...');

  try {
    // Initialize the system (load reference documents)
    await initializeSystem();

    console.log('🌐 Server is ready to accept requests!');
    console.log('📡 API Endpoints:');
    console.log('   POST /upload          - Upload CV and Project Report');
    console.log('   POST /evaluate        - Start evaluation pipeline');
    console.log('   GET  /status/:jobId   - Check evaluation status');
    console.log('   GET  /jobs            - List all jobs');
    console.log('   GET  /health          - Health check');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
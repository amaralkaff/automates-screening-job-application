import { initializeSystem } from './init';
import './server';

async function startServer() {
  try {
    await initializeSystem();
    console.log('Server ready on http://localhost:3000');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
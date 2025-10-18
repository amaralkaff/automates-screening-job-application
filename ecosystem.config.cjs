module.exports = {
  apps: [
    {
      name: 'job-evaluation-app',
      script: 'src/start.ts',
      interpreter: 'bun',
      interpreter_args: '--bun',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        DATABASE_URL: 'postgresql://postgres:postgres123@localhost:5432/job_evaluation',
        CHROMA_URL: 'http://localhost:8000',
        UPLOAD_DIR: './uploads',
        MAX_FILE_SIZE: '10485760',
        QUEUE_CONCURRENCY: '3',
        BETTER_AUTH_SECRET: 'dev-secret-key',
        BETTER_AUTH_URL: 'http://localhost:3000',
        GEMINI_API_KEY: 'test-key'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://postgres:postgres123@postgres:5432/job_evaluation',
        CHROMA_URL: 'http://chromadb:8000',
        UPLOAD_DIR: './uploads',
        MAX_FILE_SIZE: '10485760',
        QUEUE_CONCURRENCY: '3',
        BETTER_AUTH_SECRET: 'palepale123',
        BETTER_AUTH_URL: 'http://34.101.92.66',
        GEMINI_API_KEY: 'AIzaSyBWwZ58TU9tmrAWPVTA6ZvPb0gD615DOg8'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:username/automates-screening-job-application.git',
      path: '/var/www/job-evaluation',
      'pre-deploy-local': '',
      'post-deploy': 'bun install && bun run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
module.exports = {
  apps: [
    {
      name: 'job-evaluation-app',
      script: 'bun',
      args: 'run src/start.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        BETTER_AUTH_URL: 'https://amangly.web.id'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      time: true
    }
  ]
};
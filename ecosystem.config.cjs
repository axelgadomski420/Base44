// PURRE PETS — PM2 (Moduł 1). Restart z env: pm2 restart purrepets-backend --update-env
const path = require('node:path');

const APP_DIR = '/home/ubuntu/Base44';
const LOG_DIR = path.join(APP_DIR, 'logs');

module.exports = {
  apps: [
    {
      name: 'purrepets-backend',
      script: './src/server.js',
      cwd: path.join(APP_DIR, 'backend'),
      instances: 1,           // Socket.IO wymaga 1 procesu (bez Redisa)
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '10s',
      restart_delay: 2000,
      kill_timeout: 8000,
      max_memory_restart: '600M',  // anty-wyciek pamięci
      time: true,
      out_file: path.join(LOG_DIR, 'backend-out.log'),
      error_file: path.join(LOG_DIR, 'backend-error.log'),
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        HOST: '127.0.0.1',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/purrepets?schema=public',
        JWT_SECRET: 'super-secret-jwt-key-purrepets-2026',
        JWT_EXPIRES_IN: '7d',
        PUBLIC_BASE_URL: 'https://purrepets.pl',
        UPLOAD_DIR: '/var/www/purrepets/uploads',
        FRONTEND_PORT: 3000,
        MAX_UPLOAD_BYTES: 104857600,
        OLLAMA_URL: 'http://127.0.0.1:11434',
        ADMIN_EMAILS: 'effdoa@gmail.com',
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
        CORS_ORIGINS: 'http://92.5.154.243,https://purrepets.pl,http://www.purrepets.pl,https://www.purrepets.pl'
      }
    },
    {
      name: 'purrepets-frontend',
      script: 'npm',
      args: 'run preview -- --host 127.0.0.1 --port 3000',
      cwd: APP_DIR,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '10s',
      restart_delay: 2000,
      kill_timeout: 8000,
      max_memory_restart: '400M',
      time: true,
      out_file: path.join(LOG_DIR, 'frontend-out.log'),
      error_file: path.join(LOG_DIR, 'frontend-error.log'),
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
        VITE_API_URL: '',
        VITE_BASE44_APP_BASE_URL: 'https://purrepets.pl'
      }
    }
  ]
};

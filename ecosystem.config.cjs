module.exports = {
  apps: [
    {
      name: 'purrepets-backend',
      script: './src/server.js',
      cwd: '/home/ubuntu/Base44/backend',
      instances: 1,           // Socket.IO wymaga 1 procesu (bez Redisa)
      exec_mode: 'fork',
      kill_timeout: 8000,
      wait_ready: false,
      max_memory_restart: '500M',
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
        CORS_ORIGINS: 'http://92.5.154.243,https://purrepets.pl,http://www.purrepets.pl,https://www.purrepets.pl'
      }
    },
    {
      name: 'purrepets-frontend',
      script: 'npm',
      args: 'run preview -- --host 127.0.0.1 --port 3000',
      cwd: '/home/ubuntu/Base44',
      exec_mode: 'fork',
      kill_timeout: 8000,
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

module.exports = {
  apps: [
    {
      name: 'purrepets-backend',
      script: './src/server.js',
      cwd: '/home/ubuntu/Base44/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        HOST: '127.0.0.1',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/purrepets?schema=public',
        JWT_SECRET: 'super-secret-jwt-key-purrepets-2026',
        JWT_EXPIRES_IN: '7d',
        CORS_ORIGINS: 'http://92.5.154.243,https://purrepets.pl,http://www.purrepets.pl,https://www.purrepets.pl'
      }
    },
    {
      name: 'purrepets-frontend',
      script: 'npm',
      args: 'run preview -- --host 127.0.0.1 --port 3000',
      cwd: '/home/ubuntu/Base44',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
        VITE_BASE44_APP_BASE_URL: 'https://purrepets.pl'
      }
    }
  ]
};

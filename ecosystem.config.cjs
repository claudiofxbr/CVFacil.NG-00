/**
 * PM2 Ecosystem — CVFacil.NG
 * Uso:  pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'cvfacil-ng',
      script: './.next/standalone/server.js',
      cwd: '/var/www/cvfacil.ng',
      instances: 'max',       // Usa todos os CPUs disponíveis
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      // Logs
      out_file: '/var/www/cvfacil.ng/logs/out.log',
      error_file: '/var/www/cvfacil.ng/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Auto-restart
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};

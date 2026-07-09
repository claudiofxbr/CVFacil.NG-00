module.exports = {
  apps: [
    {
      name: 'portalcursos-backend',
      cwd: './backend',
      script: 'java',
      args: [
        '-Xmx512M',
        '-jar',
        'target/portalcursos-backend.jar',
        '--server.port=8080'
      ],
      env: {
        NODE_ENV: 'production',
        SPRING_PROFILES_ACTIVE: 'prod'
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '700M'
    },
    {
      name: 'portalcursos-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};

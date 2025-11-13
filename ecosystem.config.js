module.exports = {
  apps: [
    {
      name: 'delivery-autorun',
      script: './scripts/autorun.js',
      args: '30 2', // intervalSeconds durationHours (default: 30s, 2h)
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'delivery-run-once',
      script: './scripts/run_simulation.js',
      args: '',
      exec_mode: 'fork',
      instances: 1,
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};


module.exports = {
  apps: [{
    name: 'agencyhub',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/agencyhub/error.log',
    out_file: '/var/log/agencyhub/out.log',
    log_file: '/var/log/agencyhub/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000,
    reload_delay: 1000,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

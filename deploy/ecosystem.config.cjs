// pm2 process configuration for Estúdio Pedra Industrial.
//
// On the VPS, from the repo root:
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save
//   pm2 startup systemd   # then run the command it prints (survives reboots)
//
// `cwd` is pinned to the repo root so the app's runtime data (SQLite db +
// uploaded images) is created in <repo>/.data/ — matching how the server
// resolves paths via process.cwd().
const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "eps",
      cwd: path.resolve(__dirname, ".."),
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};

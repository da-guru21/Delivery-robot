PM2 quickstart for this project

This repository includes an `ecosystem.config.js` which defines two PM2 apps:

- `delivery-autorun` — runs `scripts/autorun.js` with default args `30 2` (intervalSeconds and durationHours). It restarts automatically on crash and is suitable to run continuously.
- `delivery-run-once` — runs `scripts/run_simulation.js` once (no autorestart).

Install PM2 (global)

```bash
npm install -g pm2
```

Start using the ecosystem file

```bash
# start apps defined in ecosystem file
pm2 start ecosystem.config.js

# start only autorun (useful to change args)
pm2 start ./scripts/autorun.js --name delivery-autorun -- 30 2
```

Make PM2 run at system startup

```bash
pm2 save
pm2 startup
# follow the printed instruction (run the command printed by `pm2 startup` as administrator/root)
```

Managing the process

```bash
pm2 status
pm2 logs delivery-autorun
pm2 stop delivery-autorun
pm2 restart delivery-autorun
pm2 delete delivery-autorun
```

Notes

- To change interval/duration, stop the process and restart it with different args.
- On Windows, run the `pm2 startup` output as administrator in PowerShell or CMD.
- PM2 keeps logs under `~/.pm2/logs/` by default.

If you want, I can configure a small wrapper script to rotate logs or store them under the project `logs/` directory.

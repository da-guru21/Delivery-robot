#!/usr/bin/env node
/**
 * Autorun runner: executes `run_simulation.js` at a fixed interval for a duration.
 * Usage: node scripts/autorun.js [intervalSeconds] [durationHours]
 * Environment:
 *   PG_INSERT=true to have run_simulation insert into Postgres
 */
const { spawn } = require('child_process');

const intervalSeconds =
  parseInt(process.argv[2], 10) ||
  parseInt(process.env.INTERVAL_SECONDS, 10) ||
  30;
const durationHours =
  parseFloat(process.argv[3]) || parseFloat(process.env.DURATION_HOURS) || 2;

const totalRuns = Math.ceil((durationHours * 3600) / intervalSeconds);
let runCount = 0;

console.log(
  `Autorun: interval ${intervalSeconds}s, duration ${durationHours}h, total runs ${totalRuns}`
);

function runOnce() {
  runCount++;
  console.log(
    `Starting run ${runCount}/${totalRuns} at ${new Date().toISOString()}`
  );
  const child = spawn(
    process.execPath,
    [require('path').join(__dirname, 'run_simulation.js')],
    { stdio: 'inherit' }
  );
  child.on('exit', (code) => {
    console.log(`run_simulation exited with code ${code}`);
    if (runCount >= totalRuns) {
      console.log('Completed all runs. Exiting.');
      process.exit(0);
    }
  });
}

// Start immediately, then set interval
runOnce();
const tid = setInterval(() => {
  if (runCount >= totalRuns) {
    clearInterval(tid);
    return;
  }
  runOnce();
}, intervalSeconds * 1000);

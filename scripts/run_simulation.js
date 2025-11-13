#!/usr/bin/env node
/**
 * Headless simulation runner for the delivery robot.
 * Usage:
 *   node scripts/run_simulation.js [parcelCount]
 * Environment variables:
 *   PG_INSERT=true           -> attempt to insert results into Postgres
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE -> Postgres connection
 */
const { Client } = require('pg');

// --- Simulation engine (extracted from src/main.js) ---
const roads = [
  '👩-👴',
  '👩-⛲',
  '👴-⛲',
  '⛲-🏤',
  '⛲-🐮',
  '🏤-🏢',
  '🏤-👩🏿‍🦱',
  '🏢-👩🏿‍🦱',
  '👩🏿‍🦱-👩‍🦰',
  '👩‍🦰-👩‍🦳',
  '👩‍🦰-🛒',
  '👩‍🦳-⛺',
  '🐮-🛒',
  '🐮-⛺',
];

function buildGraph(edges) {
  let graph = Object.create(null);
  function addEdge(from, to) {
    if (graph[from] == null) graph[from] = [to];
    else graph[from].push(to);
  }
  for (let [from, to] of edges.map((r) => r.split('-'))) {
    addEdge(from, to);
    addEdge(to, from);
  }
  return graph;
}
const roadGraph = buildGraph(roads);

function randomPick(array) {
  let choice = Math.floor(Math.random() * array.length);
  return array[choice];
}

class VillageState {
  constructor(place, parcels) {
    this.place = place;
    this.parcels = parcels;
  }

  move(destination) {
    if (!roadGraph[this.place].includes(destination)) return this;
    let parcels = this.parcels
      .map((p) => {
        if (p.place != this.place) return p;
        return { place: destination, address: p.address };
      })
      .filter((p) => p.place != p.address);
    return new VillageState(destination, parcels);
  }

  static random(parcelCount = 5) {
    const parcels = [];
    const seen = new Set();
    const places = Object.keys(roadGraph);
    while (parcels.length < parcelCount) {
      const address = randomPick(places);
      let place = randomPick(places);
      if (place === address) continue;
      const key = `${place}->${address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      parcels.push({ place, address });
      if (seen.size >= places.length * (places.length - 1)) break;
    }
    return new VillageState('👩', parcels);
  }
}

function findRoute(graph, from, to) {
  let work = [{ at: from, route: [] }];
  for (let i = 0; i < work.length; i++) {
    let { at, route } = work[i];
    for (let place of graph[at]) {
      if (place == to) return route.concat(place);
      if (!work.some((w) => w.at == place))
        work.push({ at: place, route: route.concat(place) });
    }
  }
}

function goalOrientedRobot({ place, parcels }, route) {
  if (route.length == 0) {
    let parcel = parcels[0];
    if (parcel.place != place)
      route = findRoute(roadGraph, place, parcel.place);
    else route = findRoute(roadGraph, place, parcel.address);
  }
  return { direction: route[0], memory: route.slice(1) };
}

// --- Simulation runner ---
async function runOnce(parcelCount = 5) {
  let state = VillageState.random(parcelCount);
  let memory = [];
  let turn = 0;
  const pickups = [];
  const deliveries = [];

  while (state.parcels.length > 0) {
    turn++;
    const prevParcels = state.parcels.slice();

    // pickups
    const pickupsNow = prevParcels.filter((p) => p.place === state.place);
    pickupsNow.forEach((p) => {
      const exists = pickups.some(
        (e) => e.from === p.place && e.to === p.address
      );
      if (!exists) pickups.push({ from: p.place, to: p.address, turn });
    });

    const action = goalOrientedRobot(state, memory || []);
    const newState = state.move(action.direction);
    memory = action.memory;

    // deliveries
    const deliveredNow = prevParcels.filter(
      (p) =>
        !newState.parcels.some(
          (np) => np.place === p.place && np.address === p.address
        )
    );
    deliveredNow.forEach((d) => {
      const exists = deliveries.some(
        (e) => e.from === d.place && e.to === d.address
      );
      if (!exists) deliveries.push({ from: d.place, to: d.address, turn });
    });

    state = newState;
  }

  return {
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    initialParcelCount: pickups.length + deliveries.length || 0,
    turns: turn,
    pickups,
    deliveries,
    finalState: state,
  };
}

async function main() {
  const parcelCount =
    parseInt(process.argv[2], 10) || parseInt(process.env.SIM_PARCELS, 10) || 5;
  const result = await runOnce(parcelCount);
  // print JSON result
  console.log(JSON.stringify(result, null, 2));

  // Optionally insert to Postgres when PG_INSERT=true
  if (process.env.PG_INSERT === 'true') {
    const client = new Client({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'postgres',
    });
    try {
      await client.connect();
      const insertText = `INSERT INTO simulations(started_at, finished_at, initial_parcels, turns, pickups, deliveries, raw)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`;
      const values = [
        result.startedAt,
        result.finishedAt,
        result.initialParcelCount,
        result.turns,
        JSON.stringify(result.pickups),
        JSON.stringify(result.deliveries),
        JSON.stringify(result),
      ];
      const res = await client.query(insertText, values);
      console.log('Inserted simulation id=', res.rows[0].id);
    } catch (err) {
      console.error('PG insert failed:', err.message);
    } finally {
      await client.end();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

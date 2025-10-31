import './style.css';
import p5 from 'p5';
import sketch from './sketch.js';

// Roads connecting places (kept near the top so visualization can read them)
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
      // safety: if not enough unique pairs exist, break
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

// Expose initial state to window for visualization and status
window.roads = roads;
window.currentState = new VillageState('🏤', []);
window.memory = [];
window.turn = 0;
window.delivered = [];
window.picked = [];

// Create start button
const startButton = document.createElement('button');
startButton.id = 'start-button';
startButton.textContent = 'Start Simulation';
document.body.appendChild(startButton);

// Initialize the visualization
const container = document.getElementById('sketch');
new p5(sketch, container);

let simulationTimer = null;
let state = window.currentState; // local reference used during simulation

// Update function called every "turn" (one second)
function updateSimulation() {
  // Increment turn counter and log
  window.turn = (window.turn || 0) + 1;

  const prevParcels = state.parcels.slice();

  // Detect pickups at the robot's current location before it moves
  const pickupsNow = prevParcels.filter((p) => p.place === state.place);
  pickupsNow.forEach((p) => {
    const exists = window.picked.some(
      (e) => e.from === p.place && e.to === p.address
    );
    if (!exists) {
      window.picked.push({ from: p.place, to: p.address, turn: window.turn });
      console.log(
        `  Picked up parcel at ${p.place} -> ${p.address} (turn ${window.turn})`
      );
    }
  });
  let action = goalOrientedRobot(state, window.memory || []);
  console.log(`Turn ${window.turn}: moving to ${action.direction}`);
  const newState = state.move(action.direction);
  window.memory = action.memory;

  // Detect delivered parcels (present in prevParcels but missing in newState.parcels)
  const deliveredNow = prevParcels.filter(
    (p) =>
      !newState.parcels.some(
        (np) => np.place === p.place && np.address === p.address
      )
  );
  deliveredNow.forEach((d) => {
    // avoid duplicate entries in delivered list
    const exists = window.delivered.some(
      (e) => e.from === d.place && e.to === d.address
    );
    if (!exists) {
      window.delivered.push({
        from: d.place,
        to: d.address,
        turn: window.turn,
      });
      console.log(
        `  Delivered parcel from ${d.place} -> ${d.address} (turn ${window.turn})`
      );
    }
  });

  state = newState;
  window.currentState = state;

  // Stop when done
  if (state.parcels.length === 0) {
    clearInterval(simulationTimer);
    console.log(`Simulation completed in ${window.turn} turns`);
    startButton.disabled = false;
    startButton.textContent = 'Start New Simulation';
  }
}

// Start button click handler
startButton.addEventListener('click', () => {
  console.clear();
  window.turn = 0;
  window.delivered = [];
  window.picked = [];
  state = VillageState.random();
  window.currentState = state;
  // remember how many parcels this run started with so UI shows that many entries
  window.initialParcelCount = state.parcels.length;
  window.memory = [];
  startButton.disabled = true;
  startButton.textContent = 'Simulation Running...';
  console.log('Simulation started');
  simulationTimer = setInterval(updateSimulation, 2000);
});

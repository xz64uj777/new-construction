// BuildWorks game rules. Pure logic, no Three.js, so it can be unit tested.
//
// v2 changes:
// - The lowboy carries the loader and excavator together (one trip out, one trip back).
// - Crew are helpers: call one for a small fee and your work goes twice as fast for that task.
// - The lowboy holds two machines and says so when it's full.
// - Replays are free, restore that task's snapshot, and can never pay a contract twice.
// - A contract board: Starter House, Driveway, and Foundation jobs.
// - Contracts repeat: settle, then start the next one. An owned excavator skips the rental.
// - A small loan stops you from getting stuck with no money.
// - Saves are checked when loaded; old v1 saves keep cash, fleet and history.

export const CONTRACT_STAGES = [
  { id: "rent-excavator", title: "Rent a mini excavator", kind: "logistics", action: "rent-excavator", location: "depot", cost: 1800, skipIfOwned: "excavator" },
  { id: "load-loader", title: "Load the wheel loader", kind: "logistics", action: "load-loader", location: "depot", machine: "truck", target: "loader" },
  { id: "load-excavator", title: "Load the excavator behind it", kind: "logistics", action: "load-excavator", location: "depot", machine: "truck", target: "excavator" },
  { id: "haul-equipment", title: "Deliver the equipment", kind: "logistics", action: "arrive-site", location: "site" },
  { id: "unload-excavator", title: "Unload the excavator", kind: "logistics", action: "unload-excavator", location: "site", machine: "truck" },
  { id: "unload-loader", title: "Unload the wheel loader", kind: "logistics", action: "unload-loader", location: "site", machine: "truck" },
  { id: "clear-grade", title: "Clear and grade the house pad", kind: "work", machine: "loader", skill: "earthworks", units: 5, crewCost: 550, reworkCost: 550 },
  { id: "excavate", title: "Excavate the foundation", kind: "work", machine: "excavator", skill: "excavation", units: 4, crewCost: 800, reworkCost: 900 },
  { id: "order-concrete", title: "Order concrete delivery", kind: "logistics", action: "order-concrete", location: "site", cost: 2400 },
  { id: "pour-foundation", title: "Pour the foundation", kind: "work", skill: "concrete", units: 3, crewCost: 900, material: "concrete", reworkCost: 2400 },
  { id: "return-for-materials", title: "Return to the depot", kind: "logistics", action: "arrive-depot", location: "depot" },
  { id: "load-materials", title: "Load lumber and driveway aggregate", kind: "logistics", action: "load-materials", location: "depot", machine: "truck", cost: 1900 },
  { id: "haul-materials", title: "Deliver the materials", kind: "logistics", action: "arrive-site", location: "site" },
  { id: "unload-materials", title: "Unload lumber and aggregate", kind: "logistics", action: "unload-materials", location: "site", machine: "truck" },
  { id: "place-lumber", title: "Place lumber and build the frame", kind: "work", machine: "loader", skill: "carpentry", units: 3, crewCost: 1100, material: "lumber", reworkCost: 1900 },
  { id: "build-driveway", title: "Spread and finish the driveway", kind: "work", machine: "loader", skill: "earthworks", units: 3, crewCost: 700, material: "aggregate", reworkCost: 700 },
  { id: "load-loader-return", title: "Load the wheel loader", kind: "logistics", action: "load-loader-return", location: "site", machine: "truck", target: "loader" },
  { id: "load-excavator-return", title: "Load the excavator behind it", kind: "logistics", action: "load-excavator-return", location: "site", machine: "truck", target: "excavator" },
  { id: "haul-home", title: "Bring the fleet back to the depot", kind: "logistics", action: "arrive-depot", location: "depot" },
  { id: "return-excavator", title: "Unload the excavator", kind: "logistics", action: "return-excavator", location: "depot" },
  { id: "unload-loader-return", title: "Unload and park the wheel loader", kind: "logistics", action: "unload-loader-return", location: "depot", machine: "truck" },
  { id: "settle-contract", title: "Settle the house contract", kind: "logistics", action: "settle-contract", location: "depot" },
];

export const CONTRACT_REWARD = 18000;

// Jobs on the contract board. They all use the same jobsite and task list:
// `existing` tasks were already built before you arrive, `skip` tasks aren't part of the job.
export const CONTRACTS = {
  house: { id: "house", name: "Starter House", reward: 18000, skip: [], existing: [], costs: {} },
  driveway: {
    id: "driveway", name: "Driveway for an Existing Home", reward: 7000, unlockAfter: 1,
    existing: ["clear-grade", "excavate", "pour-foundation", "place-lumber"],
    skip: ["rent-excavator", "load-excavator", "unload-excavator", "order-concrete", "load-excavator-return", "return-excavator"],
    costs: { "load-materials": 900 },
  },
  foundation: {
    id: "foundation", name: "Foundation for a Builder", reward: 11000, unlockAfter: 1,
    existing: [],
    skip: ["return-for-materials", "load-materials", "haul-materials", "unload-materials", "place-lumber", "build-driveway"],
    costs: {},
  },
};

export function currentContract(career) {
  return CONTRACTS[career.contractId] || CONTRACTS.house;
}

export function isStageInContract(career, stageOrId) {
  const id = typeof stageOrId === "string" ? stageOrId : stageOrId?.id;
  const c = currentContract(career);
  return !c.skip.includes(id) && !c.existing.includes(id);
}

export function stageCost(career, stage) {
  return currentContract(career).costs[stage?.id] ?? stage?.cost ?? 0;
}

export function availableContracts(career) {
  return Object.values(CONTRACTS).filter((c) => (c.unlockAfter || 0) <= career.completedContracts);
}
export const EQUIPMENT_PRICES = { excavator: 22000, dozer: 16000, roller: 9000 };
export const LOAN = { amount: 5000, payback: 5500 };
export const SAVE_VERSION = 2;
const SAVE_KEY = "buildWorksCareer";
const REPLAY_FEE = 0; // replays are free
export const TRAILER_SLOTS = 2;
export const HELPER_SPEED = 2;

export function createCareer() {
  const career = {
    version: SAVE_VERSION,
    cash: 15000,
    stageIndex: 0,
    workProgress: 0,
    owned: ["tractor", "lowboy", "loader"],
    rentals: [],
    atSite: [],
    onTrailer: [],
    truckAtSite: false,
    materials: { concrete: false, lumber: false, aggregate: false, loaded: false },
    completedContracts: 0,
    contractNumber: 1,
    contractId: "house",
    loanOwed: 0,
    helper: null,
    settled: false,
    contractComplete: false,
    checkpoints: {},
    crew: defaultCrew(),
  };
  skipOwnedStages(career);
  takeCheckpoint(career);
  return career;
}

// Each crew member has a trade-off so picking who to call matters.
function defaultCrew() {
  return [
    { id: "mara", name: "Mara", skills: ["earthworks", "excavation"], rate: 1, note: "reliable all-rounder" },
    { id: "jo", name: "Jo", skills: ["concrete", "carpentry"], rate: 1.1, note: "finish trades, a bit pricier" },
    { id: "lee", name: "Lee", skills: ["earthworks"], rate: 0.7, note: "apprentice, cheapest" },
  ];
}

export function currentStage(career) {
  return CONTRACT_STAGES[career.stageIndex] ?? null;
}

function failure(reason) {
  return { ok: false, reason, completed: false };
}

function hasMachine(career, machine) {
  return career.owned.includes(machine) || career.rentals.includes(machine);
}

function hasMachineAtSite(career, machine) {
  return career.atSite.includes(machine) && hasMachine(career, machine);
}

const clone = (value) => JSON.parse(JSON.stringify(value));

// The parts of a career that describe "where things are" in the contract.
// Money, history and the loan are deliberately left out, so replays never refund spending.
const POSITION_KEYS = ["stageIndex", "workProgress", "helper", "rentals", "atSite", "onTrailer", "truckAtSite", "materials", "contractComplete"];

function snapshot(career) {
  const s = {};
  for (const key of POSITION_KEYS) s[key] = clone(career[key]);
  return s;
}

function takeCheckpoint(career) {
  if (career.replay) return; // don't overwrite real checkpoints with replay states
  career.checkpoints ??= {};
  career.checkpoints[career.stageIndex] = snapshot(career);
}

function skipOwnedStages(career) {
  let stage = currentStage(career);
  while (stage && ((stage.skipIfOwned && career.owned.includes(stage.skipIfOwned)) || !isStageInContract(career, stage))) {
    career.stageIndex += 1;
    stage = currentStage(career);
  }
}

function advanceStage(career) {
  // A replay is a one-task detour: when it's done, go back to where you were,
  // keeping whatever money you have now.
  if (career.replay && career.stageIndex === career.replay.targetIndex) {
    Object.assign(career, clone(career.replay.resume));
    delete career.replay;
    return currentStage(career);
  }
  career.stageIndex += 1;
  career.workProgress = 0;
  career.helper = null;
  skipOwnedStages(career);
  takeCheckpoint(career);
  return currentStage(career);
}

export function restartTask(career, stageId) {
  const index = CONTRACT_STAGES.findIndex((stage) => stage.id === stageId);
  const stage = CONTRACT_STAGES[index];
  if (!stage) return failure("Choose a task from this contract.");
  if (career.replay) return failure("Finish the task you are replaying first.");
  if (index > career.stageIndex) return failure("That task is not available yet.");
  if (index === career.stageIndex) {
    career.workProgress = 0;
    return { ok: true, cost: 0, nextStage: stage, rewound: false };
  }
  if (stage.action === "settle-contract") return failure("Settling can't be replayed.");
  const checkpoint = career.checkpoints?.[index];
  if (!checkpoint) return failure("That task was skipped and can't be replayed.");
  const cost = REPLAY_FEE;
  if (career.cash < cost) return failure(`Replaying costs $${cost.toLocaleString()}.`);
  career.cash -= cost;
  career.replay = { targetIndex: index, resume: snapshot(career) };
  Object.assign(career, clone(checkpoint));
  return { ok: true, cost, nextStage: stage, rewound: true, replay: true, resumeStage: career.replay.resume.stageIndex, cash: career.cash };
}

export function advanceCareer(career, action, context = {}) {
  const stage = currentStage(career);
  if (!stage || stage.kind !== "logistics") return failure("This is a work stage.");
  if (stage.action !== action) return failure("That action is not available yet.");
  if (stage.location && context.location !== stage.location) return failure("Move to the marked location first.");
  if (stage.machine && context.machine !== stage.machine) return failure(`Use the ${stage.machine} for this action.`);
  if (stage.target && context.target !== stage.target) return failure(`Bring the ${stage.target} to the lowboy.`);
  if (stage.target && !context.nearTarget) return failure(`Move the lowboy close to the ${stage.target}.`);
  const cost = stageCost(career, stage);
  if (cost && career.cash < cost) return failure(`This costs $${cost.toLocaleString()}. You can take a loan from the job panel.`);
  if (action === "load-excavator" && !hasMachine(career, "excavator")) return failure("Rent the excavator first.");
  if (action === "load-loader" && !career.owned.includes("loader")) return failure("The wheel loader is not in your fleet.");
  if (action === "load-excavator-return" && !hasMachineAtSite(career, "excavator")) return failure("The excavator is not at the jobsite.");
  if (action === "load-loader-return" && !hasMachineAtSite(career, "loader")) return failure("The wheel loader is not at the jobsite.");
  if (action === "unload-loader" && !career.onTrailer.includes("loader")) return failure("The wheel loader is not on the lowboy.");
  if (action === "unload-excavator" && !career.onTrailer.includes("excavator")) return failure("The excavator is not on the lowboy.");
  if (action === "unload-materials" && !career.materials.loaded) return failure("Load the contract materials first.");
  if (action === "return-excavator" && !career.onTrailer.includes("excavator")) return failure("Bring the excavator back on the lowboy.");
  if (action === "unload-loader-return" && !career.onTrailer.includes("loader")) return failure("The wheel loader is not on the lowboy.");
  if (stage.material && !career.materials[stage.material]) return failure(`Deliver ${stage.material} before starting this work.`);

  if (action.startsWith("load-") && action !== "load-materials" && career.onTrailer.length >= TRAILER_SLOTS) return failure("Lowboy is full. Unload a machine first.");
  if (cost) career.cash -= cost;
  if (action === "rent-excavator") career.rentals.push("excavator");
  if (["load-loader", "load-excavator", "load-excavator-return", "load-loader-return"].includes(action)) {
    const machine = action.includes("excavator") ? "excavator" : "loader";
    career.onTrailer.push(machine);
    career.atSite = career.atSite.filter((id) => id !== machine);
  }
  if (action === "load-materials") career.materials.loaded = true;
  if (action === "unload-loader") {
    career.onTrailer = career.onTrailer.filter((id) => id !== "loader");
    career.atSite.push("loader");
  }
  if (action === "unload-excavator") {
    career.onTrailer = career.onTrailer.filter((id) => id !== "excavator");
    career.atSite.push("excavator");
  }
  if (action === "order-concrete") career.materials.concrete = true;
  if (action === "unload-materials") {
    career.materials.loaded = false;
    career.materials.lumber = true;
    career.materials.aggregate = true;
  }
  if (action === "return-excavator") {
    // A rental gets checked back in; an owned excavator just gets parked.
    career.rentals = career.rentals.filter((id) => id !== "excavator");
    career.onTrailer = career.onTrailer.filter((id) => id !== "excavator");
  }
  if (action === "unload-loader-return") {
    career.onTrailer = career.onTrailer.filter((id) => id !== "loader");
    career.atSite = career.atSite.filter((id) => id !== "loader");
  }
  if (action === "arrive-site") career.truckAtSite = true;
  if (action === "arrive-depot") career.truckAtSite = false;
  let loanRepaid = 0;
  if (action === "settle-contract") {
    if (!career.settled) {
      career.cash += currentContract(career).reward;
      loanRepaid = Math.min(career.loanOwed || 0, career.cash);
      career.cash -= loanRepaid;
      career.loanOwed = (career.loanOwed || 0) - loanRepaid;
      career.settled = true;
      career.completedContracts += 1;
    }
    career.contractComplete = true;
  }
  const nextStage = advanceStage(career);
  return { ok: true, completed: true, nextStage, cash: career.cash, loanRepaid };
}

export function performWork(career, { machine, location, inZone, shrubRemoved = false } = {}) {
  const stage = currentStage(career);
  if (!stage || stage.kind !== "work") return failure("There is no site work at this stage.");
  if (location !== "site" || !inZone) return failure("Move into the marked work zone first.");
  if (stage.id === "clear-grade" && !shrubRemoved) return failure("Physically push a shrub into the brown spoil pile to count progress.");
  if (stage.machine && machine !== stage.machine) return failure(`Use the ${stage.machine} for this work.`);
  if (stage.machine && !hasMachineAtSite(career, stage.machine)) return failure(`The ${stage.machine} must be delivered to the site.`);
  if (stage.material && !career.materials[stage.material]) return failure(`Deliver ${stage.material} before starting this work.`);
  career.workProgress = Math.min(stage.units, career.workProgress + (career.helper ? HELPER_SPEED : 1));
  if (career.workProgress < stage.units) {
    return { ok: true, completed: false, progress: career.workProgress / stage.units, nextStage: stage };
  }
  const nextStage = advanceStage(career);
  return { ok: true, completed: true, progress: 1, nextStage };
}

// What it costs to call a crew member to help with the current work stage.
export function crewQuote(career, crewId) {
  const stage = currentStage(career);
  const crew = career.crew.find((member) => member.id === crewId);
  if (!stage || stage.kind !== "work" || !crew) return null;
  const raw = stage.crewCost * 0.4 * (crew.rate ?? 1);
  return { crew, cost: Math.max(100, Math.round(raw / 10) * 10) };
}

// Crew are helpers, not a shortcut: they join you for this task and every bit of
// work you do counts double until it's finished. You still have to do the work.
export function assignCrew(career, crewId, { location } = {}) {
  const stage = currentStage(career);
  if (!stage || stage.kind !== "work" || !stage.skill) return failure("Crew can only help with site work.");
  if (location !== "site") return failure("Crew can only work at the jobsite.");
  if (career.helper) return failure(`${career.crew.find((m) => m.id === career.helper)?.name || "A crew member"} is already helping.`);
  if (stage.machine && !hasMachineAtSite(career, stage.machine)) return failure(`Deliver the ${stage.machine} before calling crew.`);
  if (stage.material && !career.materials[stage.material]) return failure(`Deliver ${stage.material} before calling crew.`);
  const crew = career.crew.find((member) => member.id === crewId);
  if (!crew || !crew.skills.includes(stage.skill)) return failure("That crew member isn't qualified for this work.");
  const { cost } = crewQuote(career, crewId);
  if (career.cash < cost) return failure(`${crew.name} charges $${cost.toLocaleString()} to help.`);
  career.cash -= cost;
  career.helper = crew.id;
  return { ok: true, completed: false, crew: crew.name, cost, nextStage: stage, cash: career.cash };
}

// A loan is only offered when you can't afford what's next, so it can't be farmed.
export function canTakeLoan(career) {
  if (career.loanOwed > 0) return false;
  const stage = currentStage(career);
  const need = Math.max(stageCost(career, stage), stage?.kind === "work" ? stage.crewCost : 0, 1);
  return career.cash < need;
}

export function takeLoan(career) {
  if (!canTakeLoan(career)) return failure("A loan is only available when you can't cover the next cost, and only one at a time.");
  career.cash += LOAN.amount;
  career.loanOwed = LOAN.payback;
  return { ok: true, amount: LOAN.amount, owed: LOAN.payback, cash: career.cash };
}

export function startNextContract(career, contractId = "house") {
  if (!career.contractComplete) return failure("Settle the current contract first.");
  const contract = availableContracts(career).find((c) => c.id === contractId);
  if (!contract) return failure("That job isn't available yet.");
  Object.assign(career, {
    stageIndex: 0,
    workProgress: 0,
    rentals: [],
    atSite: [],
    onTrailer: [],
    truckAtSite: false,
    materials: { concrete: false, lumber: false, aggregate: false, loaded: false },
    settled: false,
    contractComplete: false,
    checkpoints: {},
    contractNumber: (career.contractNumber || 1) + 1,
    contractId: contract.id,
    helper: null,
  });
  delete career.replay;
  skipOwnedStages(career);
  takeCheckpoint(career);
  return { ok: true, contractNumber: career.contractNumber, contract, nextStage: currentStage(career) };
}

export function purchaseMachine(career, machine) {
  if (!career.contractComplete) return failure("Finish the contract before buying equipment.");
  const price = EQUIPMENT_PRICES[machine];
  if (!price) return failure("That machine is not available for purchase.");
  if (career.owned.includes(machine)) return failure("Your fleet already owns this machine.");
  if (career.cash < price) return failure(`You need $${price.toLocaleString()} to buy this machine.`);
  career.cash -= price;
  career.owned.push(machine);
  return { ok: true, machine, price, cash: career.cash };
}

export function saveCareer(career, storage = globalThis.localStorage) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(career));
    return true;
  } catch {
    return false;
  }
}

const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
const isMoney = (v) => typeof v === "number" && Number.isFinite(v);

// Returns a usable career no matter what is in storage.
// `career.loadNote` explains anything that was reset, so the game can tell the player.
export function loadCareer(storage = globalThis.localStorage) {
  let saved;
  try {
    saved = JSON.parse(storage.getItem(SAVE_KEY) || "null");
  } catch {
    return withNote(createCareer(), "Your save couldn't be read, so a new career was started.");
  }
  if (!saved || typeof saved !== "object") return createCareer();

  const fresh = createCareer();
  // Old saves (v1) used a different, longer task list. Keep the money, fleet and
  // history, and restart the current contract from the top.
  if (saved.version === 1) {
    const career = fresh;
    if (isMoney(saved.cash)) career.cash = saved.cash;
    if (isStringArray(saved.owned)) career.owned = [...new Set([...career.owned, ...saved.owned])];
    if (Number.isInteger(saved.completedContracts)) career.completedContracts = saved.completedContracts;
    career.stageIndex = 0;
    skipOwnedStages(career);
    career.checkpoints = {};
    takeCheckpoint(career);
    return withNote(career, "Game updated: your cash and fleet were kept, and the contract restarted with the new two-machine lowboy.");
  }

  const valid =
    saved.version === SAVE_VERSION &&
    isMoney(saved.cash) &&
    Number.isInteger(saved.stageIndex) && saved.stageIndex >= 0 && saved.stageIndex <= CONTRACT_STAGES.length &&
    Number.isInteger(saved.workProgress) && saved.workProgress >= 0 &&
    isStringArray(saved.owned) && isStringArray(saved.rentals) && isStringArray(saved.atSite) && isStringArray(saved.onTrailer) &&
    Array.isArray(saved.crew) &&
    saved.materials && typeof saved.materials === "object";
  if (!valid) return withNote(fresh, "Your save looked damaged, so a new career was started.");
  return { ...fresh, ...saved, materials: { ...fresh.materials, ...saved.materials }, crew: mergeCrew(saved.crew), checkpoints: saved.checkpoints || {} };
}

function mergeCrew(savedCrew) {
  const defaults = defaultCrew();
  return defaults.map((d) => ({ ...d, ...(savedCrew.find((c) => c?.id === d.id) || {}), rate: d.rate, note: d.note }));
}

function withNote(career, note) {
  Object.defineProperty(career, "loadNote", { value: note, enumerable: false, configurable: true });
  return career;
}

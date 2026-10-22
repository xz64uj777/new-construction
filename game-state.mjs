export const CONTRACT_STAGES = [
  { id: "load-loader", title: "Load the wheel loader", kind: "logistics", action: "load-loader", location: "depot", machine: "truck", target: "loader" },
  { id: "haul-loader", title: "Deliver the wheel loader", kind: "logistics", action: "arrive-site", location: "site" },
  { id: "unload-loader", title: "Unload the wheel loader", kind: "logistics", action: "unload-loader", location: "site", machine: "truck" },
  { id: "clear-grade", title: "Clear and grade the house pad", kind: "work", machine: "loader", skill: "earthworks", units: 3, crewCost: 550, reworkCost: 550 },
  { id: "return-for-excavator", title: "Return to the depot", kind: "logistics", action: "arrive-depot", location: "depot" },
  { id: "rent-excavator", title: "Rent a mini excavator", kind: "logistics", action: "rent-excavator", location: "depot", cost: 1800 },
  { id: "load-excavator", title: "Load the rented excavator", kind: "logistics", action: "load-excavator", location: "depot", machine: "truck", target: "excavator" },
  { id: "haul-excavator", title: "Deliver the excavator", kind: "logistics", action: "arrive-site", location: "site" },
  { id: "unload-excavator", title: "Unload the excavator", kind: "logistics", action: "unload-excavator", location: "site", machine: "truck" },
  { id: "excavate", title: "Excavate the foundation", kind: "work", machine: "excavator", skill: "excavation", units: 4, crewCost: 800, reworkCost: 900 },
  { id: "order-concrete", title: "Order concrete delivery", kind: "logistics", action: "order-concrete", location: "site", cost: 2400 },
  { id: "pour-foundation", title: "Pour the foundation", kind: "work", skill: "concrete", units: 3, crewCost: 900, material: "concrete", reworkCost: 2400 },
  { id: "return-for-materials", title: "Return to the depot", kind: "logistics", action: "arrive-depot", location: "depot" },
  { id: "load-materials", title: "Load lumber and driveway aggregate", kind: "logistics", action: "load-materials", location: "depot", machine: "truck", cost: 1900 },
  { id: "haul-materials", title: "Deliver the materials", kind: "logistics", action: "arrive-site", location: "site" },
  { id: "unload-materials", title: "Unload lumber and aggregate", kind: "logistics", action: "unload-materials", location: "site", machine: "truck" },
  { id: "place-lumber", title: "Place lumber and build the frame", kind: "work", machine: "loader", skill: "carpentry", units: 3, crewCost: 1100, material: "lumber", reworkCost: 1900 },
  { id: "build-driveway", title: "Spread and finish the driveway", kind: "work", machine: "loader", skill: "earthworks", units: 3, crewCost: 700, material: "aggregate", reworkCost: 700 },
  { id: "load-excavator-return", title: "Load the rental excavator", kind: "logistics", action: "load-excavator-return", location: "site", machine: "truck", target: "excavator" },
  { id: "haul-excavator-home", title: "Return the rental excavator", kind: "logistics", action: "arrive-depot", location: "depot" },
  { id: "return-excavator", title: "Check in the rental excavator", kind: "logistics", action: "return-excavator", location: "depot" },
  { id: "return-for-loader", title: "Return to the jobsite", kind: "logistics", action: "arrive-site", location: "site" },
  { id: "load-loader-return", title: "Load the wheel loader", kind: "logistics", action: "load-loader-return", location: "site", machine: "truck", target: "loader" },
  { id: "haul-home", title: "Bring the fleet back to the depot", kind: "logistics", action: "arrive-depot", location: "depot" },
  { id: "unload-loader-return", title: "Unload and park the wheel loader", kind: "logistics", action: "unload-loader-return", location: "depot", machine: "truck" },
  { id: "settle-contract", title: "Settle the house contract", kind: "logistics", action: "settle-contract", location: "depot" },
];

export const CONTRACT_REWARD = 18000;
export const EQUIPMENT_PRICES = { excavator: 22000, dozer: 16000, roller: 9000 };
const SAVE_KEY = "buildWorksCareer";

export function createCareer() {
  return {
    version: 1,
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
    settled: false,
    contractComplete: false,
    crew: [
      { id: "mara", name: "Mara", skills: ["earthworks", "excavation"] },
      { id: "jo", name: "Jo", skills: ["concrete", "carpentry"] },
      { id: "lee", name: "Lee", skills: ["earthworks"] },
    ],
  };
}

export function currentStage(career) {
  return CONTRACT_STAGES[career.stageIndex] ?? null;
}

function restoreTaskCheckpoint(career, index) {
  career.rentals = index >= 6 && index <= 20 ? ["excavator"] : [];
  career.atSite = [];
  if (index >= 3 && index <= 22) career.atSite.push("loader");
  if (index >= 9 && index <= 18) career.atSite.push("excavator");
  career.onTrailer = [];
  if (index === 1 || index === 2 || index === 23 || index === 24) career.onTrailer.push("loader");
  if (index === 7 || index === 8 || index === 19 || index === 20) career.onTrailer.push("excavator");
  career.truckAtSite = (index >= 2 && index <= 4) || (index >= 8 && index <= 12) || (index >= 15 && index <= 19) || (index >= 22 && index <= 23);
  career.materials = {
    concrete: index >= 11,
    lumber: index >= 16,
    aggregate: index >= 16,
    loaded: index === 14 || index === 15,
  };
}

export function restartTask(career, stageId) {
  const index = CONTRACT_STAGES.findIndex((stage) => stage.id === stageId);
  const stage = CONTRACT_STAGES[index];
  if (!stage) return failure("Choose a task from this contract.");
  if (index > career.stageIndex) return failure("That task is not available yet.");
  if (index === career.stageIndex) {
    career.workProgress = 0;
    return { ok: true, cost: 0, nextStage: stage, rewound: false };
  }
  const cost = stage.kind === "work" ? stage.reworkCost : 250;
  if (career.cash < cost) return failure(`Rework costs $${cost.toLocaleString()}.`);
  career.cash -= cost;
  career.stageIndex = index;
  career.workProgress = 0;
  career.contractComplete = false;
  restoreTaskCheckpoint(career, index);
  return { ok: true, cost, nextStage: stage, rewound: true, cash: career.cash };
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

function advanceStage(career) {
  career.stageIndex += 1;
  career.workProgress = 0;
  return currentStage(career);
}

export function advanceCareer(career, action, context = {}) {
  const stage = currentStage(career);
  if (!stage || stage.kind !== "logistics") return failure("This is a work stage.");
  if (stage.action !== action) return failure("That action is not available yet.");
  if (stage.location && context.location !== stage.location) return failure("Move to the marked location first.");
  if (stage.machine && context.machine !== stage.machine) return failure(`Use the ${stage.machine} for this action.`);
  if (stage.target && context.target !== stage.target) return failure(`Bring the ${stage.target} to the lowboy.`);
  if (stage.target && !context.nearTarget) return failure(`Move the lowboy close to the ${stage.target}.`);
  if (stage.cost && career.cash < stage.cost) return failure(`This costs $${stage.cost.toLocaleString()}.`);
  if (action === "load-excavator" && !career.rentals.includes("excavator")) return failure("Rent the excavator first.");
  if (action === "load-loader" && !career.owned.includes("loader")) return failure("The wheel loader is not in your fleet.");
  if (action === "load-excavator-return" && !hasMachineAtSite(career, "excavator")) return failure("The rental excavator is not at the jobsite.");
  if (action === "load-loader-return" && !hasMachineAtSite(career, "loader")) return failure("The wheel loader is not at the jobsite.");
  if (action === "unload-loader" && !career.onTrailer.includes("loader")) return failure("The wheel loader is not on the lowboy.");
  if (action === "unload-excavator" && !career.onTrailer.includes("excavator")) return failure("The excavator is not on the lowboy.");
  if (action === "unload-materials" && !career.materials.loaded) return failure("Load the contract materials first.");
  if (action === "return-excavator" && (!career.rentals.includes("excavator") || !career.onTrailer.includes("excavator"))) return failure("Bring the rental excavator back on the lowboy.");
  if (action === "unload-loader-return" && !career.onTrailer.includes("loader")) return failure("The wheel loader is not on the lowboy.");
  if (stage.material && !career.materials[stage.material]) return failure(`Deliver ${stage.material} before starting this work.`);

  if (stage.cost) career.cash -= stage.cost;
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
    career.rentals = career.rentals.filter((id) => id !== "excavator");
    career.onTrailer = career.onTrailer.filter((id) => id !== "excavator");
  }
  if (action === "unload-loader-return") {
    career.onTrailer = career.onTrailer.filter((id) => id !== "loader");
    career.atSite = career.atSite.filter((id) => id !== "loader");
  }
  if (action === "arrive-site") career.truckAtSite = true;
  if (action === "arrive-depot") career.truckAtSite = false;
  if (action === "settle-contract") {
    if (!career.settled) {
      career.cash += CONTRACT_REWARD;
      career.settled = true;
      career.completedContracts += 1;
    }
    career.contractComplete = true;
  }
  const nextStage = advanceStage(career);
  return { ok: true, completed: true, nextStage, cash: career.cash };
}

export function performWork(career, { machine, location, inZone } = {}) {
  const stage = currentStage(career);
  if (!stage || stage.kind !== "work") return failure("There is no site work at this stage.");
  if (location !== "site" || !inZone) return failure("Move into the marked work zone first.");
  if (stage.machine && machine !== stage.machine) return failure(`Use the ${stage.machine} for this work.`);
  if (stage.machine && !hasMachineAtSite(career, stage.machine)) return failure(`The ${stage.machine} must be delivered to the site.`);
  if (stage.material && !career.materials[stage.material]) return failure(`Deliver ${stage.material} before starting this work.`);
  career.workProgress += 1;
  if (career.workProgress < stage.units) {
    return { ok: true, completed: false, progress: career.workProgress / stage.units, nextStage: stage };
  }
  const nextStage = advanceStage(career);
  return { ok: true, completed: true, progress: 1, nextStage };
}

export function assignCrew(career, crewId, { location } = {}) {
  const stage = currentStage(career);
  if (!stage || stage.kind !== "work" || !stage.skill) return failure("Crew can only be assigned to site work.");
  if (location !== "site") return failure("Crew can only work at the jobsite.");
  if (stage.machine && !hasMachineAtSite(career, stage.machine)) return failure(`Deliver the ${stage.machine} before assigning crew.`);
  if (stage.material && !career.materials[stage.material]) return failure(`Deliver ${stage.material} before assigning crew.`);
  const crew = career.crew.find((member) => member.id === crewId);
  if (!crew || !crew.skills.includes(stage.skill)) return failure("No crew member has the required qualification.");
  if (career.cash < stage.crewCost) return failure(`Crew work costs $${stage.crewCost.toLocaleString()}.`);
  career.cash -= stage.crewCost;
  career.workProgress = 0;
  const nextStage = advanceStage(career);
  return { ok: true, completed: true, crew: crew.name, cost: stage.crewCost, nextStage, cash: career.cash };
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

export function loadCareer(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(SAVE_KEY) || "null");
    if (!saved || saved.version !== 1 || !Array.isArray(saved.owned) || !Array.isArray(saved.crew)) return createCareer();
    return { ...createCareer(), ...saved };
  } catch {
    return createCareer();
  }
}

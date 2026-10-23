import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTRACT_REWARD,
  CONTRACT_STAGES,
  advanceCareer,
  assignCrew,
  createCareer,
  currentStage,
  loadCareer,
  performWork,
  purchaseMachine,
  restartTask,
  saveCareer,
} from "../game-state.mjs";

function advanceTo(career, stageId) {
  career.stageIndex = CONTRACT_STAGES.findIndex((stage) => stage.id === stageId);
}

test("invalid delivery actions do not advance the contract", () => {
  const career = createCareer();
  const result = advanceCareer(career, "load-loader", {
    location: "depot",
    machine: "truck",
    target: "excavator",
  });
  assert.equal(result.ok, false);
  assert.equal(career.stageIndex, 0);
  assert.equal(currentStage(career).id, "load-loader");
});

test("loader delivery unlocks site work only after arrival and unloading", () => {
  const career = createCareer();
  advanceCareer(career, "load-loader", { location: "depot", machine: "truck", target: "loader", nearTarget: true });
  advanceCareer(career, "arrive-site", { location: "site" });
  advanceCareer(career, "unload-loader", { location: "site", machine: "truck" });
  assert.deepEqual(career.atSite, ["loader"]);
  assert.equal(currentStage(career).id, "clear-grade");
});

test("manual work requires the correct delivered machine and work zone", () => {
  const career = createCareer();
  advanceTo(career, "clear-grade");
  career.atSite = ["loader"];
  assert.equal(performWork(career, { machine: "excavator", location: "site", inZone: true }).ok, false);
  assert.equal(performWork(career, { machine: "loader", location: "depot", inZone: true }).ok, false);
  assert.equal(career.workProgress, 0);
  assert.equal(performWork(career, { machine: "loader", location: "site", inZone: true }).ok, false, "ordinary work strokes cannot clear shrubs");
  for (let i = 0; i < 4; i++) performWork(career, { machine: "loader", location: "site", inZone: true, shrubRemoved: true });
  assert.equal(performWork(career, { machine: "loader", location: "site", inZone: true, shrubRemoved: true }).completed, true);
  assert.equal(currentStage(career).id, "return-for-excavator");
});

test("crew qualification and funds gate assigned work", () => {
  const career = createCareer();
  advanceTo(career, "clear-grade");
  career.atSite = ["loader"];
  const balance = career.cash;
  assert.equal(assignCrew(career, "jo", { location: "site" }).ok, false);
  assert.equal(career.cash, balance);
  const result = assignCrew(career, "mara", { location: "site" });
  assert.equal(result.ok, true);
  assert.equal(result.crew, "Mara");
  assert.equal(career.cash, balance - 550);
});

test("replaying the current work task resets progress for free", () => {
  const career = createCareer();
  advanceTo(career, "clear-grade");
  career.workProgress = 2;
  const balance = career.cash;
  const result = restartTask(career, "clear-grade");
  assert.equal(result.ok, true);
  assert.equal(result.cost, 0);
  assert.equal(career.workProgress, 0);
  assert.equal(career.cash, balance);
});

test("reopening a completed delivery task restores its checkpoint for a fee", () => {
  const career = createCareer();
  advanceTo(career, "rent-excavator");
  career.cash = 1000;
  career.rentals = ["excavator"];
  career.atSite = ["loader"];
  career.truckAtSite = false;
  const result = restartTask(career, "haul-loader");
  assert.equal(result.ok, true);
  assert.equal(result.cost, 250);
  assert.equal(career.stageIndex, 1);
  assert.deepEqual(career.onTrailer, ["loader"]);
  assert.deepEqual(career.atSite, []);
  assert.deepEqual(career.rentals, []);
  assert.equal(career.cash, 750);
});

test("reopening completed work charges rework and rolls back dependent work", () => {
  const career = createCareer();
  advanceTo(career, "build-driveway");
  career.cash = 10000;
  career.rentals = ["excavator"];
  career.atSite = ["loader", "excavator"];
  career.materials = { concrete: true, lumber: true, aggregate: true };
  career.contractComplete = true;
  const result = restartTask(career, "clear-grade");
  assert.equal(result.ok, true);
  assert.equal(result.rewound, true);
  assert.equal(career.stageIndex, CONTRACT_STAGES.findIndex((stage) => stage.id === "clear-grade"));
  assert.equal(career.cash, 9450);
  assert.deepEqual(career.rentals, []);
  assert.deepEqual(career.atSite, ["loader"]);
  assert.deepEqual(career.materials, { concrete: false, lumber: false, aggregate: false, loaded: false });
  assert.equal(career.contractComplete, false);
});

test("rework is blocked when the player cannot afford its costs", () => {
  const career = createCareer();
  advanceTo(career, "build-driveway");
  career.cash = 100;
  const result = restartTask(career, "pour-foundation");
  assert.equal(result.ok, false);
  assert.equal(career.cash, 100);
  assert.equal(currentStage(career).id, "build-driveway");
});

test("rent, materials, settlement, and purchase update career funds once", () => {
  const career = createCareer();
  advanceTo(career, "rent-excavator");
  const balance = career.cash;
  advanceCareer(career, "rent-excavator", { location: "depot" });
  assert.equal(career.cash, balance - 1800);
  assert.deepEqual(career.rentals, ["excavator"]);
  advanceTo(career, "settle-contract");
  career.cash = 25000;
  advanceCareer(career, "settle-contract", { location: "depot" });
  assert.equal(career.cash, 25000 + CONTRACT_REWARD);
  assert.equal(career.completedContracts, 1);
  career.stageIndex = CONTRACT_STAGES.findIndex((stage) => stage.id === "settle-contract");
  advanceCareer(career, "settle-contract", { location: "depot" });
  assert.equal(career.cash, 25000 + CONTRACT_REWARD);
  assert.equal(career.completedContracts, 1);
  assert.equal(purchaseMachine(career, "excavator").ok, true);
  assert.ok(career.owned.includes("excavator"));
});

test("a house contract can finish through direct work and qualified crew", () => {
  const career = createCareer();
  const move = (action, context) => assert.equal(advanceCareer(career, action, context).ok, true, action);
  move("load-loader", { location: "depot", machine: "truck", target: "loader", nearTarget: true });
  move("arrive-site", { location: "site" });
  move("unload-loader", { location: "site", machine: "truck" });
  for (let i = 0; i < 5; i++) performWork(career, { machine: "loader", location: "site", inZone: true, shrubRemoved: true });
  move("arrive-depot", { location: "depot" });
  move("rent-excavator", { location: "depot" });
  move("load-excavator", { location: "depot", machine: "truck", target: "excavator", nearTarget: true });
  move("arrive-site", { location: "site" });
  move("unload-excavator", { location: "site", machine: "truck" });
  for (let i = 0; i < 4; i++) performWork(career, { machine: "excavator", location: "site", inZone: true });
  move("order-concrete", { location: "site" });
  assert.equal(assignCrew(career, "jo", { location: "site" }).ok, true);
  move("arrive-depot", { location: "depot" });
  move("load-materials", { location: "depot", machine: "truck" });
  move("arrive-site", { location: "site" });
  move("unload-materials", { location: "site", machine: "truck" });
  assert.equal(assignCrew(career, "jo", { location: "site" }).ok, true);
  for (let i = 0; i < 3; i++) performWork(career, { machine: "loader", location: "site", inZone: true });
  move("load-excavator-return", { location: "site", machine: "truck", target: "excavator", nearTarget: true });
  move("arrive-depot", { location: "depot" });
  move("return-excavator", { location: "depot" });
  move("arrive-site", { location: "site" });
  move("load-loader-return", { location: "site", machine: "truck", target: "loader", nearTarget: true });
  move("arrive-depot", { location: "depot" });
  move("unload-loader-return", { location: "depot", machine: "truck" });
  move("settle-contract", { location: "depot" });
  assert.equal(career.contractComplete, true);
  assert.equal(career.completedContracts, 1);
  assert.equal(career.cash, 24900);
  assert.deepEqual(career.rentals, []);
});

test("career state round-trips through storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const career = createCareer();
  career.cash = 12345;
  career.stageIndex = 4;
  assert.equal(saveCareer(career, storage), true);
  assert.deepEqual(loadCareer(storage), career);
});

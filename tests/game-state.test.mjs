import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTRACTS, CONTRACT_REWARD, CONTRACT_STAGES, LOAN, availableContracts,
  advanceCareer, assignCrew, canTakeLoan, createCareer, crewQuote, currentStage,
  loadCareer, performWork, purchaseMachine, restartTask, saveCareer, startNextContract, takeLoan,
} from "../game-state.mjs";

const T = { machine: "truck" };
let lastCrewCost = 0;
const crewPaid = () => lastCrewCost;
const memoryStorage = () => {
  const values = new Map();
  return { values, getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
};

function step(career, action, context) {
  const r = advanceCareer(career, action, context);
  assert.equal(r.ok, true, `${action}: ${r.reason}`);
  return r;
}

// Plays the first contract up to the given stage id.
function playTo(career, stopId) {
  const at = () => currentStage(career)?.id;
  const run = [
    ["rent-excavator", () => step(career, "rent-excavator", { location: "depot" })],
    ["load-loader", () => step(career, "load-loader", { location: "depot", ...T, target: "loader", nearTarget: true })],
    ["load-excavator", () => step(career, "load-excavator", { location: "depot", ...T, target: "excavator", nearTarget: true })],
    ["haul-equipment", () => step(career, "arrive-site", { location: "site" })],
    ["unload-excavator", () => step(career, "unload-excavator", { location: "site", ...T })],
    ["unload-loader", () => step(career, "unload-loader", { location: "site", ...T })],
    ["clear-grade", () => { for (let i = 0; i < 5; i++) performWork(career, { machine: "loader", location: "site", inZone: true, shrubRemoved: true }); }],
    ["excavate", () => { for (let i = 0; i < 4; i++) performWork(career, { machine: "excavator", location: "site", inZone: true }); }],
    ["order-concrete", () => step(career, "order-concrete", { location: "site" })],
    ["pour-foundation", () => { const r = assignCrew(career, "jo", { location: "site" }); assert.equal(r.ok, true); lastCrewCost = r.cost; for (let i = 0; i < 2; i++) performWork(career, { location: "site", inZone: true }); }],
    ["return-for-materials", () => step(career, "arrive-depot", { location: "depot" })],
    ["load-materials", () => step(career, "load-materials", { location: "depot", ...T })],
    ["haul-materials", () => step(career, "arrive-site", { location: "site" })],
    ["unload-materials", () => step(career, "unload-materials", { location: "site", ...T })],
    ["place-lumber", () => { for (let i = 0; i < 3; i++) performWork(career, { machine: "loader", location: "site", inZone: true }); }],
    ["build-driveway", () => { for (let i = 0; i < 3; i++) performWork(career, { machine: "loader", location: "site", inZone: true }); }],
    ["load-loader-return", () => step(career, "load-loader-return", { location: "site", ...T, target: "loader", nearTarget: true })],
    ["load-excavator-return", () => step(career, "load-excavator-return", { location: "site", ...T, target: "excavator", nearTarget: true })],
    ["haul-home", () => step(career, "arrive-depot", { location: "depot" })],
    ["return-excavator", () => step(career, "return-excavator", { location: "depot" })],
    ["unload-loader-return", () => step(career, "unload-loader-return", { location: "depot", ...T })],
    ["settle-contract", () => step(career, "settle-contract", { location: "depot" })],
  ];
  for (const [id, fn] of run) {
    if (at() === stopId) return;
    if (at() === id) fn();
  }
}

test("one lowboy trip carries both machines out and back", () => {
  const career = createCareer();
  playTo(career, "unload-excavator");
  assert.deepEqual(career.onTrailer, ["loader", "excavator"]);
  playTo(career, "haul-home");
  assert.deepEqual(career.onTrailer, ["loader", "excavator"]);
  const trips = CONTRACT_STAGES.filter((s) => s.action === "arrive-site").length;
  assert.equal(trips, 2, "one equipment trip plus one materials trip");
});

test("invalid actions do not advance the contract", () => {
  const career = createCareer();
  assert.equal(advanceCareer(career, "load-loader", { location: "depot", ...T, target: "loader", nearTarget: true }).ok, false);
  assert.equal(currentStage(career).id, "rent-excavator");
});

test("manual work needs the right delivered machine and the work zone", () => {
  const career = createCareer();
  playTo(career, "clear-grade");
  assert.equal(performWork(career, { machine: "excavator", location: "site", inZone: true, shrubRemoved: true }).ok, false);
  assert.equal(performWork(career, { machine: "loader", location: "site", inZone: true }).ok, false, "ordinary strokes don't clear shrubs");
  for (let i = 0; i < 5; i++) performWork(career, { machine: "loader", location: "site", inZone: true, shrubRemoved: true });
  assert.equal(currentStage(career).id, "excavate");
});

test("a crew helper doubles your work speed but doesn't do it for you", () => {
  const career = createCareer();
  playTo(career, "excavate");
  assert.equal(assignCrew(career, "jo", { location: "site" }).ok, false, "Jo isn't qualified");
  const before = career.cash;
  const r = assignCrew(career, "mara", { location: "site" });
  assert.equal(r.ok, true);
  assert.equal(r.completed, false, "calling crew does not finish the task");
  assert.equal(currentStage(career).id, "excavate");
  assert.equal(career.cash, before - r.cost);
  assert.ok(r.cost < 800, "cheaper than the old instant finish");
  assert.equal(assignCrew(career, "mara", { location: "site" }).ok, false, "can't pay twice");
  performWork(career, { machine: "excavator", location: "site", inZone: true });
  assert.equal(career.workProgress, 2);
  performWork(career, { machine: "excavator", location: "site", inZone: true });
  assert.equal(currentStage(career).id, "order-concrete", "4 units done in 2 strokes");
  assert.equal(career.helper, null, "helper leaves when the task is done");
});

test("the lowboy says when it's full", () => {
  const career = createCareer();
  playTo(career, "load-excavator");
  career.onTrailer.push("dozer");
  const r = advanceCareer(career, "load-excavator", { location: "depot", ...T, target: "excavator", nearTarget: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /full/);
});

test("replaying a task keeps money spent during the replay and returns you to where you were", () => {
  const career = createCareer();
  playTo(career, "load-materials");
  const where = career.stageIndex;
  const r = restartTask(career, "pour-foundation");
  assert.equal(r.ok, true);
  assert.equal(currentStage(career).id, "pour-foundation");
  const afterFee = career.cash;
  const crew = assignCrew(career, "jo", { location: "site" });
  assert.equal(crew.ok, true);
  for (let i = 0; i < 2; i++) performWork(career, { location: "site", inZone: true });
  assert.equal(career.stageIndex, where, "back to the task you left");
  assert.equal(career.cash, afterFee - crew.cost, "crew pay during the replay is not refunded");
  assert.equal(career.replay, undefined);
});

test("replaying restores that task's real machine positions", () => {
  const career = createCareer();
  playTo(career, "order-concrete");
  restartTask(career, "haul-equipment");
  assert.deepEqual(career.onTrailer, ["loader", "excavator"]);
  assert.equal(career.truckAtSite, false);
});

test("replays are free", () => {
  const career = createCareer();
  playTo(career, "build-driveway");
  career.cash = 0;
  assert.equal(restartTask(career, "pour-foundation").ok, true);
  assert.equal(career.cash, 0);
});

test("a finished contract can never be paid twice", () => {
  const career = createCareer();
  playTo(career, "never");
  const cash = career.cash, done = career.completedContracts;
  assert.equal(restartTask(career, "settle-contract").ok, false);
  // even replaying an earlier task and coming back through settle doesn't pay again
  assert.equal(restartTask(career, "unload-loader-return").ok, true);
  advanceCareer(career, "unload-loader-return", { location: "depot", machine: "truck" });
  advanceCareer(career, "settle-contract", { location: "depot" });
  assert.equal(career.cash, cash);
  assert.equal(career.completedContracts, done);
});

test("the contract board unlocks new jobs that pay and play differently", () => {
  const career = createCareer();
  assert.deepEqual(availableContracts(career).map((c) => c.id), ["house"]);
  playTo(career, "never");
  assert.deepEqual(availableContracts(career).map((c) => c.id), ["house", "driveway", "foundation"]);

  assert.equal(startNextContract(career, "driveway").ok, true);
  assert.equal(currentStage(career).id, "load-loader", "no excavator rental on a driveway job");
  let cash = career.cash;
  playTo(career, "never");
  assert.equal(career.completedContracts, 2);
  assert.equal(career.cash, cash - 900 + CONTRACTS.driveway.reward);

  assert.equal(startNextContract(career, "foundation").ok, true);
  cash = career.cash;
  playTo(career, "never");
  assert.equal(career.completedContracts, 3);
  assert.equal(career.cash, cash - 1800 - 2400 - crewPaid(career) + CONTRACTS.foundation.reward);
});

test("a loan rescues a broke player once, and the payout repays it", () => {
  const career = createCareer();
  playTo(career, "order-concrete");
  assert.equal(canTakeLoan(career), false);
  career.cash = 1000;
  assert.equal(canTakeLoan(career), true);
  assert.equal(takeLoan(career).ok, true);
  assert.equal(career.cash, 1000 + LOAN.amount);
  assert.equal(takeLoan(career).ok, false, "only one loan at a time");
  playTo(career, "never");
  assert.equal(career.loanOwed, 0);
});

test("full contract pays once, then the next contract starts and an owned excavator skips the rental", () => {
  const career = createCareer();
  playTo(career, "never");
  assert.equal(career.contractComplete, true);
  assert.equal(career.completedContracts, 1);
  assert.deepEqual(career.rentals, []);
  assert.equal(advanceCareer(career, "settle-contract", { location: "depot" }).ok, false, "cannot be paid twice");
  const cash = career.cash;
  assert.ok(cash > 15000);
  career.cash += 30000;
  assert.equal(purchaseMachine(career, "excavator").ok, true);
  assert.equal(startNextContract(career).ok, true);
  assert.equal(career.contractNumber, 2);
  assert.equal(currentStage(career).id, "load-loader", "rental step skipped");
  const before = career.cash;
  playTo(career, "never");
  assert.equal(career.completedContracts, 2);
  assert.ok(career.owned.includes("excavator"), "owned excavator is kept, not returned");
  assert.ok(career.cash > before);
});

test("saves round-trip", () => {
  const storage = memoryStorage();
  const career = createCareer();
  playTo(career, "excavate");
  assert.equal(saveCareer(career, storage), true);
  assert.deepEqual(loadCareer(storage), career);
});

test("damaged saves are replaced with a fresh career and a note", () => {
  const storage = memoryStorage();
  storage.setItem("buildWorksCareer", JSON.stringify({ version: 2, cash: "lots", stageIndex: 999 }));
  const loaded = loadCareer(storage);
  assert.equal(loaded.stageIndex, 0);
  assert.match(loaded.loadNote, /damaged/);
  storage.setItem("buildWorksCareer", "{not json");
  assert.match(loadCareer(storage).loadNote, /couldn't be read/);
});

test("old v1 saves keep cash and fleet", () => {
  const storage = memoryStorage();
  storage.setItem("buildWorksCareer", JSON.stringify({ version: 1, cash: 40000, stageIndex: 17, owned: ["tractor", "lowboy", "loader", "dozer"], crew: [], completedContracts: 2 }));
  const loaded = loadCareer(storage);
  assert.equal(loaded.cash, 40000);
  assert.ok(loaded.owned.includes("dozer"));
  assert.equal(loaded.completedContracts, 2);
  assert.equal(currentStage(loaded).id, "rent-excavator");
  assert.match(loaded.loadNote, /updated/);
});

test("a failed save reports false instead of throwing", () => {
  assert.equal(saveCareer(createCareer(), { setItem() { throw new Error("full"); } }), false);
});

test("Lee is the cheapest earthworks helper", () => {
  const career = createCareer();
  playTo(career, "clear-grade");
  assert.ok(crewQuote(career, "lee").cost < crewQuote(career, "mara").cost);
});

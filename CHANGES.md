# BuildWorks: what changed (version 2)

Changes to two files: `game-state.mjs` (the game rules) and `index.html` (the game screen).
The tests in `tests/` were updated to match, and all 17 pass (`node --test tests/`).

## What you'll notice when you play

- **The lowboy carries both machines.** You rent the excavator first, then load the loader and the excavator together and make one trip out and one trip back. The contract went from 26 steps to 22, with two fewer round trips.
- **There's a CALL CREW button.** It shows up on screen during site work. A crew member joins you for that task for a small fee, and every bit of work you do counts double until the task is done. They help, but you still do the work.
  - Mara does earthworks and digging at the normal price.
  - Jo does concrete and carpentry and costs a bit more.
  - Lee only does earthworks, but he's the cheapest.
- **The lowboy tells you when it's full.** It holds two machines, and if you try to add a third you get a "Lowboy is full" message instead of nothing happening.
- **There's a contract board.** After your first house, JOB TASKS lets you pick your next job:
  - **Starter House** pays $18,000 and is the full job.
  - **Driveway for an Existing Home** pays $7,000. The house is already built, you only need the loader, and it takes 12 steps.
  - **Foundation for a Builder** pays $11,000. You clear, dig and pour, then haul the machines home.
  - If you've bought your own excavator, the rental step is skipped.
- **You can't get stuck broke anymore.** When you can't afford the next step, JOB TASKS offers a $5,000 loan. It's paid back as $5,500 out of your next contract payout, and you can only have one at a time.
- **Replays are free.** Replaying a finished task puts the machines back where they were for that task, and you go right back to where you were when you finish. Settling a contract can't be replayed, and a job can never pay out twice.
- **Saves are safer.**
  - A damaged save starts a fresh career and tells you why.
  - Older saves keep your cash and fleet, and only the current contract restarts.
  - If your browser refuses to save (for example in private mode), the game warns you.
- **Fixed a lost-progress bug.** If you reopened the game after loading the loader, it used to knock the loader off the trailer while the game still thought it was loaded, and you got stuck. That's fixed.
- **Lighter on phones.** Small screens now run at a slightly lower resolution with simpler shadows.

## Next up: paved driveway job (plan for whoever builds it)

Right now the driveway job is a **gravel** driveway, spread by the loader. A real paved driveway needs a paver and a roller.

- **New machines:**
  - An **asphalt paver** you can rent for about $1,500 a job or buy for about $30,000.
  - The **roller** that's already in the store, at $9,000.
- **New job, "Paved Driveway":** it pays more than gravel, around $12,000, and is unlocked after the gravel driveway. The steps are:
  1. Spread the gravel base with the loader, the same as now.
  2. Order a hot asphalt delivery for about $2,000.
  3. Drive the paver down the marked driveway lane to lay the asphalt. It should show up as dark strips behind the paver.
  4. Roll it flat with the roller, a few passes.
- **Hauling:** The lowboy still holds two machines, so the paver and roller go out together on their own trip after the loader.
- **Store:** Hide the dozer and roller until a job uses them. The roller shows up once Paved Driveway is unlocked. The dozer stays hidden until a job needs it.
- **Code notes:**
  - Jobs are listed in `CONTRACTS` in `game-state.mjs`. Add the new steps to `CONTRACT_STAGES`, and have the other jobs skip them.
  - Add tests in `tests/game-state.test.mjs` like the existing job tests.

## Not done yet (ideas for later)
- Jobs that use the dozer and roller
- A concrete truck you back up to the forms
- Deadlines or weather
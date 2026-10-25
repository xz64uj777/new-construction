// Loader for split game logic
const parts = ['./game_part_0.js', './game_part_1.js', './game_part_2.js', './game_part_3.js', './game_part_4.js', './game_part_5.js'];
let full = '';
async function load() {
  for (const p of parts) {
    const r = await fetch(p);
    if (!r.ok) throw new Error('Failed to load ' + p);
    full += await r.text() + '\n';
  }
  const s = document.createElement('script');
  s.type = 'module';
  s.textContent = full;
  document.body.appendChild(s);
}
load().catch(e => console.error(e));

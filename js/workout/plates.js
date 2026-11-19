// @ts-check
// =============================================================================
// PLATE MATH (js/workout/plates.js)
//
// Pure, DOM-free. "What do I load per side?" — table stakes for barbell lifters
// and a gap vs every competitor. Greedy breakdown of a target weight onto a bar,
// per side, from the standard plate set; surfaced inline
// on the cockpit's coach-target line (no new buttons).
// =============================================================================

export const KG_BAR = 20;
export const LB_BAR = 45;
export const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const LB_PLATES = [45, 35, 25, 10, 5, 2.5];

/**
 * Break a total barbell weight into plates PER SIDE.
 * @param {number} total  total weight incl. bar
 * @param {number} [bar]
 * @param {number[]} [plates]  available plate denominations (desc)
 * @returns {{ perSide: {plate:number,count:number}[], exact:boolean, leftover:number, barOnly:boolean, belowBar:boolean }}
 */
export function computePlateBreakdown(total, bar = KG_BAR, plates = KG_PLATES) {
  const t = Number(total);
  if (!Number.isFinite(t)) return { perSide: [], exact: false, leftover: 0, barOnly: false, belowBar: false };
  if (t < bar) return { perSide: [], exact: t === bar, leftover: 0, barOnly: t === bar, belowBar: t < bar };
  if (t === bar) return { perSide: [], exact: true, leftover: 0, barOnly: true, belowBar: false };

  let perSideWeight = (t - bar) / 2;
  const perSide = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    if (perSideWeight <= 0) break;
    const count = Math.floor((perSideWeight + 1e-9) / p);
    if (count > 0) { perSide.push({ plate: p, count }); perSideWeight -= count * p; }
  }
  return {
    perSide,
    exact: perSideWeight < 1e-6,
    leftover: Math.max(0, Math.round(perSideWeight * 100) / 100),
    barOnly: false,
    belowBar: false,
  };
}

const trimNum = (n) => (Number.isInteger(n) ? String(n) : String(n));

/** Short per-side string, e.g. "20 + 20 + 2.5". Empty when it's just the bar. */
export function formatPlates(breakdown) {
  if (!breakdown || breakdown.barOnly) return 'bar only';
  if (breakdown.belowBar) return '';
  if (!breakdown.perSide.length) return '';
  const parts = [];
  for (const { plate, count } of breakdown.perSide) {
    for (let i = 0; i < count; i++) parts.push(trimNum(plate));
  }
  let s = parts.join(' + ');
  if (!breakdown.exact && breakdown.leftover > 0) s += ` (+${trimNum(breakdown.leftover)} short)`;
  return s;
}

/**
 * One-call convenience: target + unit + optional gym setup → "per side: 20 + 20".
 * `setup` comes from the active equipment profile; omitted callers keep the
 * standard bar/plate set.
 * @param {number|string} total
 * @param {'kg'|'lb'|'lbs'|string} [unit]
 * @param {{ bar?: number, plates?: number[] }|null} [setup]
 */
export function plateHint(total, unit = 'kg', setup = null) {
  const isLb = unit === 'lb' || unit === 'lbs';
  const defaultBar = isLb ? LB_BAR : KG_BAR;
  const defaultPlates = isLb ? LB_PLATES : KG_PLATES;
  const setupBar = Number(setup?.bar);
  const bar = Number.isFinite(setupBar) && setupBar > 0 ? setupBar : defaultBar;
  const plates = Array.isArray(setup?.plates) && setup.plates.length ? setup.plates : defaultPlates;
  const bd = computePlateBreakdown(Number(total), bar, plates);
  const s = formatPlates(bd);
  return s ? `${s} / side` : '';
}

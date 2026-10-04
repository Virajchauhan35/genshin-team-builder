import roleScores from '../data/roleScores.json';

const MAX_SUGGESTIONS = 4;      // alternatives shown per empty slot
const LISTED_FLOOR = 0.6;       // a character you listed in a slot counts at least this much
const FILLED_FIT = 0.5;         // fit needed to call a slot "filled" (= role score 5/10)
const MIN_VIABLE_SCORE = 0.5;   // archetype must score this much to be shown
const CLOSE_MATCH_MARGIN = 0.1; // two archetypes this close = "ambiguous", show both
const UNUSED_PENALTY = 0.2;     // score lost for each picked character the comp can't use
const CARRY_SCORE = 8;          // dps score that counts as a real carry

const ELEMENTS = ['Cryo', 'Hydro', 'Pyro', 'Electro', 'Anemo', 'Geo', 'Dendro'];
const ALL_KINDS = ['dps', 'subdps', 'healer', 'shielder', 'support'];

const roleScore = (id, kind) => roleScores[id]?.[kind] ?? 0;

const REACTIONS = {
  'Hydro+Pyro': { name: 'Vaporize', weight: 3 },
  'Cryo+Pyro': { name: 'Melt', weight: 3 },
  'Electro+Pyro': { name: 'Overload', weight: 2 },
  'Dendro+Pyro': { name: 'Burning', weight: 2 },
  'Dendro+Electro': { name: 'Quicken', weight: 3 },
  'Dendro+Hydro': { name: 'Bloom', weight: 2 },
  'Cryo+Hydro': { name: 'Freeze', weight: 3 },
  'Electro+Hydro': { name: 'Electro-Charged', weight: 2 },
  'Cryo+Electro': { name: 'Superconduct', weight: 2 },
};

function reactionBetween(a, b) {
  if (a === b) return null;
  const direct = REACTIONS[[a, b].sort().join('+')];
  if (direct) return direct;
  const other = a === 'Anemo' ? b : b === 'Anemo' ? a : null;
  if (other && ['Pyro', 'Hydro', 'Electro', 'Cryo'].includes(other)) {
    return { name: 'Swirl', weight: 1 };
  }
  return null;
}

function findBestReaction(chars) {
  const found = {};
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const r = reactionBetween(chars[i].element, chars[j].element);
      if (!r) continue;
      const f = (found[r.name] ??= { ...r, members: new Set() });
      f.members.add(chars[i].id);
      f.members.add(chars[j].id);
    }
  }
  return (
    Object.values(found).sort(
      (a, b) => b.members.size * b.weight - a.members.size * a.weight
    )[0] ?? null
  );
}

/*turn a slot's text ("Hydro Applicator", "Healer/Shielder") into
   the role scores it needs, so we never hard-code who may fill it.*/
function parseSlot(roleText) {
  const t = roleText.toLowerCase();
  const elements = ELEMENTS.filter((e) => t.includes(e.toLowerCase()));
  const noSub = t.replace(/sub[\s-]?dps/g, '');

  const kinds = [];
  if (/dps/.test(noSub)) kinds.push('dps');
  if (/sub[\s-]?dps|applicator|trigger|flex/.test(t)) kinds.push('subdps');
  if (/heal/.test(t)) kinds.push('healer');
  if (/shield/.test(t)) kinds.push('shielder');
  if (/applicator|trigger|flex|support|enabler/.test(t)) kinds.push('support');

  return {
    element: elements.length === 1 ? elements[0] : null,
    kinds: kinds.length ? [...new Set(kinds)] : ALL_KINDS,
  };
}

function buildSlot(arch, raw, byId) {
  const need = parseSlot(raw.role);
  const damageSlot = need.kinds.includes('dps') || need.kinds.includes('subdps');
  return {
    role: raw.role,
    options: raw.options,
    weight: Number(raw.weight ?? raw.wight ?? 0.2),
    required: raw.required !== false,
    need,
    strict: Boolean(arch.core?.length),
    elements: damageSlot
      ? new Set(raw.options.map((o) => byId[o.id]?.element).filter(Boolean))
      : null,
  };
}

function slotFit(char, slot) {
  const best = Math.max(...slot.need.kinds.map((k) => roleScore(char.id, k))) / 10;
  const listed = slot.options.some((o) => o.id === char.id);

  if (listed) return Math.max(best, LISTED_FLOOR);
  if (slot.strict) return 0;
  if (slot.need.element && char.element !== slot.need.element) return 0;
  if (slot.elements && !slot.elements.has(char.element)) return 0;
  return best >= FILLED_FIT ? best : 0;
}

/*score an archetype against the picked characters.
   Tries every way of putting picked characters into slots (at most
   4 x 4, so brute force is instant) and keeps the best weighted total. */
function bestAssignment(slots, chars) {
  let best = { total: -1, picks: [] };
  const picks = new Array(slots.length).fill(null);

  function go(i, used, total) {
    if (i === slots.length) {
      if (total > best.total) best = { total, picks: [...picks] };
      return;
    }
    picks[i] = null;
    go(i + 1, used, total);
    for (const c of chars) {           
      if (used.has(c.id)) continue;
      const fit = slotFit(c, slots[i]);
      if (fit < FILLED_FIT) continue;
      picks[i] = { char: c, fit };
      used.add(c.id);
      go(i + 1, used, total + slots[i].weight * fit);
      used.delete(c.id);
      picks[i] = null;
    }
  }
  go(0, new Set(), 0);
  return best;
}

function scoreArchetype(arch, selected, ctx) {
  const slots = arch.slots.map((s) => buildSlot(arch, s, ctx.byId));
  const { total, picks } = bestAssignment(slots, selected);
  const totalWeight = slots.reduce((sum, s) => sum + s.weight, 0);

  let score = total / totalWeight;

  const core = arch.core ?? [];
  if (core.length) {
    const have = selected.filter((c) => core.includes(c.id)).length;
    score = have ? Math.min(1, score + 0.1 * have) : score * 0.5;
  }

  const unplaced = selected.filter((c) => !picks.some((p) => p?.char.id === c.id));
  score = Math.max(0, score - UNUSED_PENALTY * unplaced.length);

  return {
    arch,
    score,
    unplaced,
    filled: picks.filter(Boolean).length,
    slotResults: slots.map((slot, i) => ({ slot, pick: picks[i] })),
  };
}

function withOwned(char, ctx) {
  return { ...char, owned: ctx.ownedAll || ctx.ownedIds.has(char.id) };
}

function rankCandidates(entries, ctx) {
  return entries
    .sort((a, b) => {
      const ownedDiff =
        Number(ctx.ownedAll || ctx.ownedIds.has(b.char.id)) -
        Number(ctx.ownedAll || ctx.ownedIds.has(a.char.id));
      return ownedDiff || b.value - a.value || b.char.rarity - a.char.rarity;
    })
    .slice(0, MAX_SUGGESTIONS)
    .map((e) => withOwned(e.char, ctx));
}

function suggestForSlot(slot, excludeIds, ctx) {
  const entries = ctx.characters
    .filter((c) => !excludeIds.has(c.id))
    .map((c) => ({ char: c, value: slotFit(c, slot) }))
    .filter((e) => e.value >= FILLED_FIT);
  return rankCandidates(entries, ctx);
}

function buildRecommendation(result, ctx) {
  const used = new Set(ctx.selectedIds);
  const rows = result.slotResults;
  const missingRequired = rows.some((r) => r.slot.required && !r.pick);
  const optionalToShow = missingRequired
    ? null
    : rows
        .filter((r) => !r.slot.required && !r.pick)
        .sort((a, b) => b.slot.weight - a.slot.weight)[0] ?? null;

  const recommendedSlots = [];
  for (const r of rows) {
    if (r.pick) {
      recommendedSlots.push({
        role: r.slot.role, character: r.pick.char, isFilled: true, suggestions: [],
      });
      continue;
    }
    if (!r.slot.required && r !== optionalToShow) continue;
    const suggestions = suggestForSlot(r.slot, used, ctx);
    if (!suggestions.length) continue;
    used.add(suggestions[0].id);
    recommendedSlots.push({
      role: r.slot.role, character: suggestions[0], isFilled: false, suggestions,
    });
  }

  // be honest about picks this comp can't use
  let archetype = result.arch;
  if (result.unplaced.length) {
    const names = result.unplaced.map((c) => c.name).join(', ');
    archetype = {
      ...archetype,
      description: `${archetype.description} Not used in this comp: ${names}.`,
    };
  }
  return { archetype, score: result.score, recommendedSlots };
}

/* FALLBACK: build a team straight from the picks. */
const SUPPORT_KINDS = ['subdps', 'shielder', 'healer', 'support']; // tie-break order

function pickKind(id) {
  let best = 'support';
  let bestScore = -1;
  for (const k of SUPPORT_KINDS) {
    if (roleScore(id, k) > bestScore) { best = k; bestScore = roleScore(id, k); }
  }
  return best;
}

function labelFor(char, kind) {
  if (kind === 'dps') return 'Main DPS';
  if (kind === 'subdps') return `${char.element} Sub-DPS`;
  if (kind === 'healer') return 'Healer';
  if (kind === 'shielder') return `${char.element} Shielder`;
  return `${char.element} Support`;
}

function synergy(candidate, team, anchor, reactionName) {
  let s = 0;
  for (const m of team) {
    const r = reactionBetween(candidate.element, m.element);
    if (!r) continue;
    s += r.weight * (m === anchor ? 1 : 0.5) * (r.name === reactionName ? 1.5 : 1);
  }
  return s;
}

function buildGenerated(selected, ctx, roleConflict) {
  const reaction = findBestReaction(selected);
  const carry = [...selected].sort((a, b) => roleScore(b.id, 'dps') - roleScore(a.id, 'dps'))[0];
  const mainDps = roleScore(carry.id, 'dps') >= FILLED_FIT * 10 ? carry : null;

  if (!reaction && !mainDps) {
    return {
      type: 'none',
      roleConflict,
      reason:
        "These characters don't share an elemental reaction and none of them is a main DPS to build around. Add a main DPS carry and I'll build the rest of the team around it.",
    };
  }
  const rows = selected
    .map((c) => ({ char: c, kind: c === mainDps ? 'dps' : pickKind(c.id) }))
    .sort((a, b) => Number(b.kind === 'dps') - Number(a.kind === 'dps'));
  const have = new Set(rows.map((r) => r.kind));

  // 2) what is the team still missing? (most important first)
  const needs = [];
  if (!have.has('dps')) needs.push({ label: 'Main DPS', kinds: ['dps'] });
  if (!have.has('healer') && !have.has('shielder'))
    needs.push({ label: 'Healer/Shielder', kinds: ['healer', 'shielder'] });
  if (!have.has('subdps')) needs.push({ label: 'Sub-DPS / Applicator', kinds: ['subdps'] });
  needs.push({ label: 'Support', kinds: ['support'] });

  const anchor = mainDps ?? selected[0];
  const team = [...selected];
  const used = new Set(ctx.selectedIds);

  const recommendedSlots = rows.map((r) => ({
    role: labelFor(r.char, r.kind),
    character: r.char,
    isFilled: true,
    suggestions: [],
  }));

  for (const need of needs.slice(0, Math.max(0, 4 - selected.length))) {
    const entries = ctx.characters
      .filter((c) => !used.has(c.id))
      .map((c) => ({
        char: c,
        roleVal: Math.max(...need.kinds.map((k) => roleScore(c.id, k))),
      }))
      .filter((e) => e.roleVal >= FILLED_FIT * 10)
      .map((e) => ({
        char: e.char,
        value: e.roleVal + synergy(e.char, team, anchor, reaction?.name),
      }));
    const suggestions = rankCandidates(entries, ctx);
    if (!suggestions.length) continue;
    used.add(suggestions[0].id);
    team.push(suggestions[0]);
    recommendedSlots.push({
      role: need.label, character: suggestions[0], isFilled: false, suggestions,
    });
  }

  const names = selected.map((c) => c.name).join(', ');
  return {
    type: 'strong',
    generated: true,
    archetype: {
      id: 'generated',
      name: reaction ? `Custom ${reaction.name} Team` : `Team built around ${mainDps.name}`,
      description: reaction
        ? `No preset comp fits ${names} well, so this team is built from your picks around ${reaction.name}.`
        : `No elemental reaction links ${names}, so the open slots are chosen to support ${mainDps.name}.`,
    },
    score: reaction ? 0.5 : 0.4,
    recommendedSlots,
    roleConflict,
  };
}

function isCarry(id) {
  const dps = roleScore(id, 'dps');
  return dps >= CARRY_SCORE && ALL_KINDS.every((k) => dps >= roleScore(id, k));
}

function detectRoleConflict(selected) {
  const carries = selected.filter((c) => isCarry(c.id));
  if (carries.length > 1) {
    return {
      conflict: true,
      message: `${carries.map((c) => c.name).join(' and ')} are both built as Main DPS carries. Most teams only run one on-field damage dealer, so running both means one of them is going to waste. Pick one to be your carry and build the rest of the team around them.`,
    };
  }
  return { conflict: false, message: null };
}

function makeCtx(selectedIds, characters, ownedIds) {
  return {
    byId: Object.fromEntries(characters.map((c) => [c.id, c])),
    characters,
    selectedIds,
    ownedIds,
    // if the user hasn't marked anything as owned, don't spam "(don't have)" on everyone
    ownedAll: !ownedIds || ownedIds.size === 0,
  };
}

export function getBestTeamMatch(selectedIds, archetypes, characters, ownedIds = new Set()) {
  const ctx = makeCtx(selectedIds, characters, ownedIds);
  const selected = selectedIds.map((id) => ctx.byId[id]).filter(Boolean);

  const roleConflict = detectRoleConflict(selected);
  if (selected.length < 2) return { type: 'none', roleConflict };

  const scored = archetypes
    .map((a) => scoreArchetype(a, selected, ctx))
    .sort((a, b) => b.score - a.score);

  const viable = scored.filter((s) => s.score >= MIN_VIABLE_SCORE && s.filled >= 2);

  if (viable.length) {
    const contenders = viable
      .filter((s) => viable[0].score - s.score <= CLOSE_MATCH_MARGIN)
      .slice(0, 2);
    if (contenders.length > 1) {
      return {
        type: 'ambiguous',
        options: contenders.map((r) => buildRecommendation(r, ctx)),
        roleConflict,
      };
    }
    return { type: 'strong', ...buildRecommendation(viable[0], ctx), roleConflict };
  }

  return buildGenerated(selected, ctx, roleConflict);
}

export function getCharacterMode(id) {
  const helper = Math.max(...['subdps', 'healer', 'shielder', 'support'].map((k) => roleScore(id, k)));
  return roleScore(id, 'dps') >= helper ? 'carry' : 'enabler';
}

export function getTeamsForCharacter(charId, archetypes, characters, ownedIds = new Set()) {
  const ctx = makeCtx([charId], characters, ownedIds);
  const char = ctx.byId[charId];
  if (!char) return null;

  const teams = archetypes
    .map((a) => scoreArchetype(a, [char], ctx))
    .filter((r) => r.filled === 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => buildRecommendation(r, ctx));

  const mode = getCharacterMode(charId);
  const carries = [];
  if (mode === 'enabler') {
    for (const t of teams) {
      for (const slot of t.recommendedSlots) {
        if (slot.isFilled || !parseSlot(slot.role).kinds.includes('dps')) continue;
        for (const c of slot.suggestions) {
          if (!carries.some((x) => x.id === c.id)) carries.push(c);
        }
      }
    }
    carries.sort((a, b) => Number(b.owned) - Number(a.owned));
  }
  return { char, mode, teams, carries: carries.slice(0, 8) };
}

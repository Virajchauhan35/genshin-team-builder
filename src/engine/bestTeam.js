const MIN_VIABLE_SCORE = 0.5;    
const CLOSE_MATCH_MARGIN = 0.15; 
const MAX_SUGGESTIONS = 4;       

const ELEMENTS = ["Cryo", "Hydro", "Pyro", "Electro", "Anemo", "Geo", "Dendro"];


function inferSlotRequirements(roleText) {
  const element = ELEMENTS.find((e) => roleText.includes(e)) || null;

  let tags = [];
  if (/heal/i.test(roleText)) tags.push("Healer");
  if (/shield/i.test(roleText)) tags.push("Shielder");
  if (/sub[\s-]?dps/i.test(roleText)) tags.push("Sub-DPS");
  else if (/dps/i.test(roleText)) tags.push("Main DPS");
  if (/applicator|trigger|core|swirl/i.test(roleText)) tags.push("Support", "Sub-DPS");
  if (/support/i.test(roleText)) tags.push("Support", "Energy Support");

  return { element, tags };
}

function characterFitsSlot(character, roleText) {
  const { element, tags } = inferSlotRequirements(roleText);
  if (element && character.element !== element) return false;
  if (tags.length === 0) return true;
  return character.roles?.some((r) => tags.includes(r));
}

function scoreArchetype(archetype, selectedIds) {
  const slotResults = archetype.slots.map((slot) => ({
    ...slot,
    filledBy: slot.options.find((opt) => selectedIds.includes(opt.id)) || null,
  }));

  const requiredSlots = slotResults.filter((s) => s.required !== false);
  const filledRequired = requiredSlots.filter((s) => s.filledBy).length;
  const score = requiredSlots.length ? filledRequired / requiredSlots.length : 0;
  const missingRequired = requiredSlots.filter((s) => !s.filledBy);

  return { archetype, slotResults, requiredSlots, missingRequired, score };
}

function getSuggestions(slot, selectedIds, usedIds, allCharacters) {
  const seen = new Set();
  const suggestions = [];

  const tryAdd = (id) => {
    if (selectedIds.includes(id) || usedIds.has(id) || seen.has(id)) return;
    const character = allCharacters.find((c) => c.id === id);
    if (!character) return;
    seen.add(id);
    suggestions.push(character);
  };

  slot.options.forEach((opt) => tryAdd(opt.id));

  if (suggestions.length < MAX_SUGGESTIONS) {
    allCharacters
      .filter((c) => characterFitsSlot(c, slot.role))
      .forEach((c) => tryAdd(c.id));
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}

function buildRecommendation(result, selectedIds, characters) {
  const usedIds = new Set(selectedIds);
  const recommendedSlots = result.slotResults.map((slot) => {
    if (slot.filledBy) {
      usedIds.add(slot.filledBy.id);
      return {
        role: slot.role,
        character: characters.find((c) => c.id === slot.filledBy.id),
        isFilled: true,
        suggestions: [],
      };
    }
    const suggestions = getSuggestions(slot, selectedIds, usedIds, characters);
    if (suggestions[0]) usedIds.add(suggestions[0].id);
    return {
      role: slot.role,
      character: suggestions[0] || null,
      isFilled: false,
      suggestions,
    };
  });
  return { archetype: result.archetype, score: result.score, recommendedSlots };
}


function detectRoleConflict(selectedIds, characters) {
  const selected = selectedIds
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean);

  const mainDps = selected.filter((c) => c.roles?.includes("Main DPS"));
  if (mainDps.length > 1) {
    return {
      conflict: true,
      message: `${mainDps.map((c) => c.name).join(" and ")} are both built as Main DPS carries. Most teams only run one on-field damage dealer, so running both means one of them is going to waste. Pick one to be your carry and build the rest of the team around them.`,
    };
  }
  return { conflict: false, message: null };
}

function synergyTierMessage(topScore) {
  if (topScore === 0) {
    return "These two don't share a single team archetype — there's genuinely nothing pulling them together. Try a different partner for either one.";
  }
  if (topScore < 0.34) {
    return "These two barely have anything going for them together. There's a faint overlap, but nowhere near enough to call it a real team.";
  }
  return "These characters don't form a strong team together. Try a different combination.";
}

export function getBestTeamMatch(selectedIds, archetypes, characters) {
  const roleConflict = detectRoleConflict(selectedIds, characters);

  if (selectedIds.length < 2) return { type: "none", roleConflict };

  const scored = archetypes
    .map((a) => scoreArchetype(a, selectedIds))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];

  // No real synergy — check if ONE missing required role would fix it
  if (top.score < MIN_VIABLE_SCORE) {
    const nearMiss = scored.find(
      (s) => s.score > 0 && s.missingRequired.length === 1
    );
    if (nearMiss) {
      const slot = nearMiss.missingRequired[0];
      const suggestions = getSuggestions(slot, selectedIds, new Set(), characters);
      return {
        type: "near-miss",
        archetype: nearMiss.archetype,
        missingRole: slot.role,
        suggestedCharacter: suggestions[0] || null,
        suggestions,
        roleConflict,
      };
    }
    return { type: "none", roleConflict, reason: synergyTierMessage(top.score) };
  }

  // Genuine tie — up to 2 archetypes within margin of the top score
  const contenders = scored
    .filter((s) => s.score > 0 && top.score - s.score <= CLOSE_MATCH_MARGIN)
    .slice(0, 2);

  if (contenders.length > 1) {
    return {
      type: "ambiguous",
      options: contenders.map((r) => buildRecommendation(r, selectedIds, characters)),
      roleConflict,
    };
  }

  return { type: "strong", ...buildRecommendation(top, selectedIds, characters), roleConflict };
}

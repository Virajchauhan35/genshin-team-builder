/**
 * Calculates weighted compatibility between a team and a single archetype.
 *
 * @param {string[]} teamIds - character ids currently on the team
 * @param {object} archetype - one archetype object from archetypes.json
 * @returns {{
 *   archetypeId: string,
 *   name: string,
 *   percentage: number,
 *   filled: { role: string, characterId: string, weight: number }[],
 *   missing: { role: string, weight: number, options: string[] }[]
 * }}
 *
 * NOTE: this does not check minConstellation yet — a character counts as
 * satisfying a requirement just by being present. Constellation-aware
 * scoring comes in step 6.
 */
export function calculateMatch(teamIds, archetype) {
  let matchedWeight = 0;
  const filled = [];
  const missing = [];

  for (const req of archetype.requirements) {
    const matchedOption = req.options.find(opt => teamIds.includes(opt.id));

    if (matchedOption) {
      matchedWeight += req.weight;
      filled.push({ role: req.role, characterId: matchedOption.id, weight: req.weight });
    } else {
      missing.push({
        role: req.role,
        weight: req.weight,
        options: req.options.map(o => o.id)
      });
    }
  }

  return {
    archetypeId: archetype.id,
    name: archetype.name,
    percentage: Math.round(matchedWeight * 100),
    filled,
    missing
  };
}

/**
 * Runs calculateMatch against every archetype and returns them
 * ranked highest-percentage first.
 *
 * @param {string[]} teamIds
 * @param {object[]} archetypes - the full archetypes.json array
 * @returns {ReturnType<typeof calculateMatch>[]}
 */
export function matchAllArchetypes(teamIds, archetypes) {
  return archetypes
    .map(archetype => calculateMatch(teamIds, archetype))
    .sort((a, b) => b.percentage - a.percentage);
}
const MIN_VIABLE_SCORE = 0.5;
const CLOSE_MATCH_MARGIN = 0.15;

function scoreArchetype(archetype,selectedIds) {
    const slotResults = archetype.slots.map((slot) => ({
        ...slot,
        filledBy: slot.options.find((opt) => selectedIds.includes(opt.id)) || null,
    }));

    const requiredSlots = slotResults.filter((s) => s.required !== false);
    const filledrequired = requiredSlots.filter((s) => s.filledBy).length;
    const score = requiredSlots.length? filledrequired / requiredSlots.length :0;
    const missingRequired = requiredSlots.filter((s) => !s.filledBy);

    return{ archetype, slotResults, requiredSlots , missingRequired, score };
}

function pickReplacement(slot,selectedIds,usedIds){
    const candidate = slot.options.find((opt) => !selectedIds.includes(opt.id) && !usedIds.has(opt.id));
    return candidate || slot.options[0];
}

function bulidRecommendation(result, selectedIds, characters){
    const usedIds =  new Set(selectedIds);
    const recommendedSlots  = result.slotResutls.map((slot) => {
        if (slot.filledBy) {
            usedIds.add(slot.filledBy.id);
            return {
                role: slot.role,
                character: characters.find((c) => c.id === slot.filledBy.id),
                isFilled: true,
            };
        }
        const pick = pickReplacement(slot, selectedIds, usedIds);
        usedIds.add(pick.id);
        return {
            role: slot.role,
            character:characters.find((c) => c.id === pick.id ),
            isFilled:false,
        };
    });
    return {archetype:result.archetype, score:result.score,recommendedSlots };
}

export function getBestTeamMatch(selectedIds,archetypes,characters) {
    if(selectedIds.length <2) return{type:"none"};

    const scored = archetypes
     .map((a) => scoreArchetype(a,selectedIds))
     .sort(( a, b) => b.score - a.score);

    const top = scored[0];

    if(top.score < MIN_VIABLE_SCORE){
        const nearMiss = scored.find(
            (s) => s.score > 0 && s.missingRequired.length === 1
        );
        if(nearMiss) {
            const slot = nearMiss.missingRequired[0];
            const suggestion = pickReplacement(slot,selectedIds,new Set());
            return {
                type: "near-Miss",
                archetype: nearMiss.archetype,
                missingRole: slot.role,
                suggestedCharacter: characters.find((c) => c.id ===suggestion.id),
            };
        }
        return{type:"none"};
    }
    const contenders = scored.filter((s) => s.score > 0 && top.score - s.score <= CLOSE_MATCH_MARGIN)
        .slice(0,2);

        if (contenders.length > 1) {
            return {
                type:"ambiguous",
                options: contenders.map((r) => bulidRecommendation(r,selectedIds,characters)),
            };
        }
        return{type:"strong", ...bulidRecommendation(top,selectedIds,characters)};
}
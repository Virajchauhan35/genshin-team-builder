 export function scoreArchetype(archetype, owned) {
    const ownedIds = Object.keys(owned);

    const slotResults = archetype.slots.map((slot) => {
        const match = slot.options.find((option) => ownedIds.includes(option.id));
        return{
            role: slot.role,
            required: slot.required !== false,
            filled: Boolean(match),
            filledBy: match ? {id: match.id, note: match.note || null}:null,
            options:slot.options,
        };
    });

    const filledSlots = slotResults.filter((s) => s.filled).length;
    const requiredSlots = slotResults.filter((s) => s.required);
    const isComplete = requiredSlots.every((s) => s.filled);
    const score = filledSlots / archetype.slots.length;
    
    return{
        archetype,
        slotResults,
        filledSlots,
        totalSlots: archetype.slots.length,
        isComplete,
        score
    };
}

export function getRankedTeams(archetype, owned) {
    return archetype
    .map((archetype) => scoreArchetype(archetype, owned))
    .filter((results) => results.filledSlots >= 2)
    .sort((a,b) => {
        if(isFinite.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
        return b.filledSlots - a.filledSlots;
    });
}
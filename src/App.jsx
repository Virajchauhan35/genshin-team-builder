import { useState, useMemo } from 'react';
import characters from './data/characters.json';
import archetypes from './data/archetypes.json';
import CharacterCard from './compenents/charactercard';
import ArchetypeCard from './compenents/archetypecard';

const MAX_TEAM = 4;

function App() {
  const [selectedIds, setSelectedIds] = useState([]);

  function toggleCharacter(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      if (selectedIds.length >= MAX_TEAM) return;
      setSelectedIds([...selectedIds, id]);
    }
  }

  const matchedArchetypes = useMemo(() => {
    if (selectedIds.length < 2) return [];
    return archetypes
      .map((arch) => {
        const slotResults = arch.slots.map((slot) => ({
          ...slot,
          filledBy: slot.options.find((opt) => selectedIds.includes(opt.id)),
        }));
        const requiredSlots = slotResults.filter((s) => s.required !== false);
        const filledRequired = requiredSlots.filter((s) => s.filledBy).length;
        const score = requiredSlots.length ? filledRequired / requiredSlots.length : 0;
        return { ...arch, slotResults, score };
      })
      .filter((a) => a.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [selectedIds]);

  function getBestTeamForCharacter(charId) {
    const matches = archetypes.filter((a) =>
      a.slots.some((s) => s.options.some((o) => o.id === charId))
    );
    if (matches.length === 0) return null;

    const best = matches.sort((a, b) => {
      const aReq = a.slots.filter((s) => s.required !== false).length;
      const bReq = b.slots.filter((s) => s.required !== false).length;
      return bReq - aReq;
    })[0];

    const recommendedSlots = best.slots.map((slot) => {
      const isThisChar = slot.options.some((o) => o.id === charId);
      const pick = isThisChar
        ? slot.options.find((o) => o.id === charId)
        : slot.options[0];
      return { role: slot.role, character: characters.find((c) => c.id === pick.id) };
    });

    return { archetype: best, recommendedSlots };
  }

  return (
    <div>
      <h1>Genshin Team Builder</h1>
      <p>Selected: {selectedIds.length}/{MAX_TEAM}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {characters.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            isSelected={selectedIds.includes(char.id)}
            disabled={selectedIds.length >= MAX_TEAM && !selectedIds.includes(char.id)}
            onToggle={() => toggleCharacter(char.id)}
          />
        ))}
      </div>

      {selectedIds.length === 1 && (() => {
        const suggestion = getBestTeamForCharacter(selectedIds[0]);
        return suggestion ? (
          <div className="best-team">
            <h2>Best Team: {suggestion.archetype.name}</h2>
            <p>{suggestion.archetype.description}</p>
            <div style={{ display: "flex", gap: "12px" }}>
              {suggestion.recommendedSlots.map((s, i) => (
                <img
                  key={i}
                  src={s.character?.icon}
                  alt={s.character?.name}
                  title={`${s.role}: ${s.character?.name}`}
                  style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }}
                />
              ))}
            </div>
          </div>
        ) : (
          <p>No archetype found for this character yet.</p>
        );
      })()}

      {selectedIds.length >= 2 && (
        <div>
          <h2>Matching Team Archetypes</h2>
          {matchedArchetypes.length === 0 ? (
            <p>No matching archetypes for this combination yet.</p>
          ) : (
            matchedArchetypes.map((arch) => (
              <ArchetypeCard key={arch.id} archetype={arch} characters={characters} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default App;
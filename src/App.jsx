import { useState, useMemo } from 'react';
import characters from './data/characters.json';
import archetypes from './data/archetypes.json';
import CharacterCard from './compenents/charactercard';
import { getBestTeamMatch } from './engine/bestTeam';

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

  const bestMatch = useMemo(
    () => getBestTeamMatch(selectedIds, archetypes, characters),
    [selectedIds]
  );

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
      return { role: slot.role, character: characters.find((c) => c.id === pick.id), isFilled: true, suggestions: [] };
    });

    return { archetype: best, recommendedSlots };
  }

  // Renders one slot: filled = just the character. Empty = the top pick
  // PLUS a row of alternate options the user can swap in if they don't own the top pick.
  function renderSlot(s, i, size) {
    return (
      <div key={i} style={{ textAlign: 'center' }}>
        {s.isFilled ? (
          <>
            <img
              src={s.character?.icon}
              alt={s.character?.name}
              title={`${s.role}: ${s.character?.name}`}
              style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ fontSize: 12 }}>{s.character?.name}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{s.role} — pick one:</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {(s.suggestions.length ? s.suggestions : [s.character]).filter(Boolean).map((opt) => (
                <div key={opt.id} style={{ opacity: 0.75 }}>
                  <img
                    src={opt.icon}
                    alt={opt.name}
                    title={opt.name}
                    style={{ width: size * 0.6, height: size * 0.6, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ fontSize: 10 }}>{opt.name}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderSlots(slots, size = 80) {
    return (
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {slots.map((s, i) => renderSlot(s, i, size))}
      </div>
    );
  }

  function renderConflictWarning() {
    if (!bestMatch.roleConflict?.conflict) return null;
    return (
      <p style={{ color: '#e0a030', border: '1px solid #e0a030', borderRadius: 6, padding: '8px 12px' }}>
        ⚠ {bestMatch.roleConflict.message}
      </p>
    );
  }

  return (
    <div>
      <h1>Genshin Team Builder</h1>
      <p>Selected: {selectedIds.length}/{MAX_TEAM}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
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
            {renderSlots(suggestion.recommendedSlots)}
          </div>
        ) : (
          <p>No archetype found for this character yet.</p>
        );
      })()}

      {selectedIds.length >= 2 && (
        <div>
          <h2>Team Analysis</h2>
          {renderConflictWarning()}

          {bestMatch.type === 'none' && (
            <p>These characters don't form a strong team together. Try a different combination.</p>
          )}

          {bestMatch.type === 'near-miss' && (
            <div>
              <p>
                Close, but not a complete comp yet — you're missing a{' '}
                <strong>{bestMatch.missingRole}</strong> for {bestMatch.archetype.name}.
              </p>
              {renderSlots(
                [{ role: bestMatch.missingRole, isFilled: false, character: bestMatch.suggestedCharacter, suggestions: bestMatch.suggestions }],
                72
              )}
            </div>
          )}

          {bestMatch.type === 'strong' && (
            <div>
              <h3>Best Team: {bestMatch.archetype.name}</h3>
              <p>{bestMatch.archetype.description}</p>
              {renderSlots(bestMatch.recommendedSlots)}
            </div>
          )}

          {bestMatch.type === 'ambiguous' && (
            <div>
              <p>
                {bestMatch.roleConflict?.conflict
                  ? 'Two different comps fit — but as noted above, pick which character you\'re actually building around first:'
                  : 'Two comps genuinely fit this selection — pick based on your goal:'}
              </p>
              {bestMatch.options.map((opt, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  <h3>{opt.archetype.name}</h3>
                  <p style={{ fontSize: 13, opacity: 0.8 }}>{opt.archetype.description}</p>
                  {renderSlots(opt.recommendedSlots, 64)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

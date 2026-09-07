import { useState, useMemo } from 'react';
import characters from './data/characters.json';
import archetypes from './data/archetypes.json';
import CharacterCard from './compenents/charactercard';
import { getBestTeamMatch } from './engine/bestTeam';

const MAX_TEAM = 4;

function App() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set());

  function toggleCharacter(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      if (selectedIds.length >= MAX_TEAM) return;
      setSelectedIds([...selectedIds, id]);
    }
  }

  function toggleOwned(id) {
    setOwnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const bestMatch = useMemo(
    () => getBestTeamMatch(selectedIds, archetypes, characters, ownedIds),
    [selectedIds, ownedIds]
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
      return {
        role: slot.role,
        character: characters.find((c) => c.id === pick.id),
        isFilled: true,
        suggestions: [],
      };
    });

    return { archetype: best, recommendedSlots };
  }

  // Renders one slot. Filled = just show the character.
  // Empty = show every option, owned ones first and full-brightness,
  // unowned ones dimmed with a "don't have" label. If NOTHING in the
  // list is owned, add a plain note about what's worth going for.
  function renderSlot(s, i, size) {
    const options = (s.suggestions.length ? s.suggestions : [s.character]).filter(Boolean);
    const anyOwned = options.some((o) => o.owned);

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
              {options.map((opt) => (
                <div key={opt.id} style={{ opacity: opt.owned ? 1 : 0.4 }}>
                  <img
                    src={opt.icon}
                    alt={opt.name}
                    title={opt.owned ? opt.name : `${opt.name} (not owned)`}
                    style={{ width: size * 0.6, height: size * 0.6, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ fontSize: 10 }}>
                    {opt.name}
                    {!opt.owned && ' (don\u2019t have)'}
                  </div>
                </div>
              ))}
            </div>
            {!anyOwned && options.length > 0 && (
              <div style={{ fontSize: 11, color: '#e0a030', marginTop: 4, maxWidth: 220 }}>
                You don't own any {s.role} pick yet — {options[0].rarity === 5 ? 'worth wishing for' : 'worth farming'}{' '}
                <strong>{options[0].name}</strong> ({options[0].rarity}★) if you're building toward this comp.
              </div>
            )}
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

  // Show exactly ONE explanation, whichever actually applies:
  // - if a real archetype exists but two picks compete for the same job, that's the DPS-conflict warning
  // - if nothing fits at all, the synergy-tier message (rendered inline below) is the real reason
  function renderConflictWarning() {
    if (bestMatch.type === 'none') return null;
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
      <p style={{ fontSize: 12, opacity: 0.7 }}>Click ☆ on a card to mark characters you actually own.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {characters.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            isSelected={selectedIds.includes(char.id)}
            disabled={selectedIds.length >= MAX_TEAM && !selectedIds.includes(char.id)}
            onToggle={() => toggleCharacter(char.id)}
            owned={ownedIds.has(char.id)}
            onToggleOwned={() => toggleOwned(char.id)}
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
            <p style={{ color: '#e0a030', border: '1px solid #e0a030', borderRadius: 6, padding: '8px 12px' }}>
              ⚠ {bestMatch.reason}
            </p>
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
                  ? "Two different comps fit — but as noted above, pick which character you're actually building around first:"
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

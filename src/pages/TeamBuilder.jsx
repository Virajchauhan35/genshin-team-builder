import { useMemo, useState } from 'react';
import CharacterTile from '../ui/CharacterTile';
import { TeamResult, SingleView } from '../ui/TeamView';
import { getBestTeamMatch, getTeamsForCharacter } from '../engine/teamEngine';

const MAX_TEAM = 4;

export default function TeamBuilder({ characters, archetypes, owned, onGoOwned }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const pool = showAll ? characters : characters.filter((c) => owned.has(c.id));

  function toggle(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return prev.length >= MAX_TEAM ? prev : [...prev, id];
    });
  }

  const analysis = useMemo(() => {
    if (selectedIds.length === 1) {
      return { kind: 'single', data: getTeamsForCharacter(selectedIds[0], archetypes, characters, owned) };
    }
    if (selectedIds.length >= 2) {
      return { kind: 'team', match: getBestTeamMatch(selectedIds, archetypes, characters, owned) };
    }
    return null;
  }, [selectedIds, owned, archetypes, characters]);

  return (
    <section>
      <div className="toolbar">
        <strong>Picked {selectedIds.length}/{MAX_TEAM}</strong>
        {selectedIds.length > 0 && (
          <button type="button" className="link" onClick={() => setSelectedIds([])}>Clear picks</button>
        )}
        <label className="switch">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show characters I don't own
        </label>
      </div>

      {pool.length === 0 ? (
        <div className="panel">
          <p>You haven't marked any characters as owned yet.</p>
          <button type="button" className="primary" onClick={onGoOwned}>Go to My Characters</button>
        </div>
      ) : (
        <div className="grid">
          {pool.map((c) => (
            <CharacterTile
              key={c.id}
              character={c}
              active={selectedIds.includes(c.id)}
              disabled={selectedIds.length >= MAX_TEAM && !selectedIds.includes(c.id)}
              onClick={() => toggle(c.id)}
            />
          ))}
        </div>
      )}

      {!analysis && pool.length > 0 && (
        <p className="note">Pick one character to see their best teams, or pick several and I'll build around them.</p>
      )}
      {analysis?.kind === 'single' && analysis.data && <SingleView data={analysis.data} />}
      {analysis?.kind === 'team' && <TeamResult match={analysis.match} />}
    </section>
  );
}
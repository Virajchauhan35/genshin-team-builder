import { useMemo, useState } from 'react';
import archetypes from '../data/archetypes.json';
import { getPullRecommendations } from '../engine/teamEngine';

const pct = (n) => `${Math.round(n * 100)}%`;

export default function PullAdvisor({ characters, owned, onGoOwned }) {
  const [fiveOnly, setFiveOnly] = useState(true);

  const picks = useMemo(
    () => getPullRecommendations(archetypes, characters, owned),
    [characters, owned],
  );
  const shown = picks.filter((p) => !fiveOnly || p.char.rarity === 5).slice(0, 6);

  if (owned.size === 0) {
    return (
      <p className="note">
        Mark the characters you own first, then I can tell you who adds the most.{' '}
        <button type="button" className="link" onClick={onGoOwned}>Go to My Characters</button>
      </p>
    );
  }

  return (
    <section>
      <div className="toolbar">
        <strong>Best pulls for your roster</strong>
        <label className="switch">
          <input type="checkbox" checked={fiveOnly} onChange={(e) => setFiveOnly(e.target.checked)} />
          5★ only
        </label>
      </div>

      {shown.length === 0 && <p className="note">No character adds much to your roster right now.</p>}

      {shown.map((p, i) => (
        <div key={p.char.id} className={`panel el-${p.char.element}`}>
          <div className="pull-head">
            <img src={p.char.icon} alt="" className="pull-icon" />
            <div>
              <h3>{i + 1}. {p.char.name}</h3>
              <small className="desc">{p.char.element} · {p.char.weapon} · {p.char.rarity}★</small>
            </div>
          </div>
          <ul className="pull-comps">
            {p.comps.slice(0, 3).map((c) => (
              <li key={c.id}>
                {c.name}: {pct(c.before)} → <strong>{pct(c.after)}</strong>
                {c.unlocks && <span className="tag tag-Easy">unlocks</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

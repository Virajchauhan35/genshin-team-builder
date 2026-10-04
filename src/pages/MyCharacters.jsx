import { useState } from 'react';
import CharacterTile from '../ui/CharacterTile';

const ELEMENTS = ['Pyro', 'Hydro', 'Electro', 'Cryo', 'Anemo', 'Geo', 'Dendro'];

export default function MyCharacters({ characters, owned, onToggle, onClear }) {
  const [search, setSearch] = useState('');
  const [element, setElement] = useState('All');

  const shown = characters.filter(
    (c) =>
      (element === 'All' || c.element === element) &&
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section>
      <p className="note">
        Tap the characters you own. It saves on this device, and the Team Builder will use only these.
      </p>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search a character"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <strong>You own {owned.size} of {characters.length}</strong>
        {owned.size > 0 && <button type="button" className="link" onClick={onClear}>Clear all</button>}
      </div>

      <div className="chips">
        {['All', ...ELEMENTS].map((el) => (
          <button
            key={el}
            type="button"
            className={`chip ${el !== 'All' ? `el-${el}` : ''} ${element === el ? 'on' : ''}`}
            onClick={() => setElement(el)}
          >
            {el}
          </button>
        ))}
      </div>

      <div className="grid">
        {shown.map((c) => (
          <CharacterTile
            key={c.id}
            character={c}
            active={owned.has(c.id)}
            badge={owned.has(c.id) ? '✓' : null}
            onClick={() => onToggle(c.id)}
          />
        ))}
      </div>
    </section>
  );
}
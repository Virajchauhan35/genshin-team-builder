import { useState } from 'react';
import characters from './data/characters.json';
import archetypes from './data/archetypes.json';
import useOwned from './hooks/useOwned';
import MyCharacters from './pages/MyCharacters';
import TeamBuilder from './pages/TeamBuilder';
import './ui/ui.css';

function App() {
  const [page, setPage] = useState('team');
  const { owned, toggle, clear } = useOwned();

  return (
    <div className="gtb">
      <header>
        <h1>Genshin Team Builder</h1>
        <p>Tell me who you own. I'll tell you the team that actually works.</p>
        <nav>
          <button type="button" className={page === 'owned' ? 'on' : ''} onClick={() => setPage('owned')}>
            My Characters ({owned.size})
          </button>
          <button type="button" className={page === 'team' ? 'on' : ''} onClick={() => setPage('team')}>
            Team Builder
          </button>
        </nav>
      </header>

      {page === 'owned' ? (
        <MyCharacters characters={characters} owned={owned} onToggle={toggle} onClear={clear} />
      ) : (
        <TeamBuilder
          characters={characters}
          archetypes={archetypes}
          owned={owned}
          onGoOwned={() => setPage('owned')}
        />
      )}
    </div>
  );
}

export default App;
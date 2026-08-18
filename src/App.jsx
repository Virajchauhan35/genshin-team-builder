import { useState } from 'react';
import characters from './data/characters.json';
import CharacterCard from './compenents/charactercard';

function App(){
    const [selectedIds, setSelectedIds] = useState([]);

  function toggleCharacter(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds,id]);
    }
  }

  return(
    <div>
      <h1>Genshin Team Builder</h1>
      <div style={{ display:"flex",flexWrap:"wrap",gap:"16px" }}>
        {characters.map((char) => (
          <CharacterCard 
          key={char.id} 
          character={char}
          isSelected={selectedIds.includes(char.id)}
          onToggle={() => toggleCharacter(char.id)} 
          />
        ))}
      </div>
    </div>
  );
}

export default App;
import characters from './data/characters.json';
import CharacterCard from './compenents/charactercard';

function App(){
  return(
    <div>
      <h1>Genshin Team Builder</h1>
      <div style={{ display:"flex",flexWrap:"wrap",gap:"16px" }}>
        {characters.map((char) => (
          <CharacterCard key={char.id} character={char} />
        ))}
      </div>
    </div>
  );
}

export default App;
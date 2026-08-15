import characters from './data/characters.json';

function App(){
  return(
    <div>
      <h1>Genshin Team Builder</h1>
      <p>Loaded {characters.length} characters</p>
    </div>
  );
}

export default App;
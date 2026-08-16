function CharacterCard({ character}){
    return(
        <div style ={{
            border:"2px solid gray",
            borderRadius:"8px",
            padding:"12px",
            width:"150px",
            textAlign:"center"
        }}>
            <img src={character.icon} alt={character.name} style ={{width:"80px", height:"80px"}} />
            <h3>{character.name}</h3>
            <p>{character.element}</p>
            <p>{character.wepon}</p>
        </div>
    );
}

export default CharacterCard;
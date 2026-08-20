function CharacterCard({ character,isSelected,onToggle,disabled}){
    return(
        <div 
        onClick={disabled ? undefined : onToggle}
        style ={{
            border: isSelected ?"3px solid gold":"2px solid gray",
            borderRadius:"8px",
            padding:"12px",
            width:"150px",
            textAlign:"center",
            background: isSelected ? "#3a3a1a": "transparent",
            cursor: disabled && !isSelected ? 0.4 : 1,
            pointerEvents : disabled && !isSelected ? "none" : "auto",
        }}
        >
            <img 
            src={character.icon} 
            alt={character.name} 
            style ={{width:"80px", height:"80px"}} />
            
            <h3>{character.name}</h3>
            <p>{character.element}</p>
            <p>{character.wepon}</p>
        </div>
    );
}

export default CharacterCard;
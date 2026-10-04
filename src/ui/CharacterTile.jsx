// One clickable character card. Used on both pages.
export default function CharacterTile({ character, active, badge, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`tile el-${character.element} ${active ? 'active' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {badge && <span className="tile-badge">{badge}</span>}
      <img src={character.icon} alt="" />
      <strong>{character.name}</strong>
      <small>{character.element} · {character.weapon}</small>
    </button>
  );
}
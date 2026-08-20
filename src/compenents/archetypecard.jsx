function ArchetypeCard({ archetype, characters }) {
  const charById = (id) => characters.find((c) => c.id === id);

  return (
    <div className="archetype-card">
      <h3>{archetype.name}</h3>
      <p>{archetype.description}</p>
      <div className="slots">
        {archetype.slotResults.map((slot, i) => (
          <div
            key={i}
            className={`slot ${slot.filledBy ? 'filled' : 'empty'} ${
              slot.required === false ? 'optional' : 'required'
            }`}
          >
            <span className="role">{slot.role}</span>
            {slot.filledBy ? (
              <img
                src={charById(slot.filledBy.id)?.icon}
                alt={charById(slot.filledBy.id)?.name}
                title={charById(slot.filledBy.id)?.name}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ display: "flex", gap: "4px" }}>
                {slot.options.map((o) => (
                  <img
                    key={o.id}
                    src={charById(o.id)?.icon}
                    alt={charById(o.id)?.name}
                    title={charById(o.id)?.name}
                    style={{ width: 32, height: 32, borderRadius: "50%", opacity: 0.5 }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="score">Match: {Math.round(archetype.score * 100)}%</div>
    </div>
  );
}

export default ArchetypeCard;

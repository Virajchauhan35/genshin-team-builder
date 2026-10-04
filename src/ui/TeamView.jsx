// Everything that draws a team: slots, team cards, and the 3 result layouts.

function Avatar({ c, size, dim }) {
  return (
    <div className={`avatar el-${c.element} ${dim ? 'dim' : ''}`} title={dim ? `${c.name} (not owned)` : c.name}>
      <img src={c.icon} alt={c.name} style={{ width: size, height: size }} />
      <span>{c.name}</span>
    </div>
  );
}

function Slot({ slot }) {
  const options = slot.isFilled ? [] : slot.suggestions;
  const anyOwned = options.some((o) => o.owned);
  return (
    <div className="slot">
      <div className="slot-role">{slot.role}</div>
      {slot.isFilled ? (
        <Avatar c={slot.character} size={72} />
      ) : (
        <>
          <div className="slot-pick">Pick one</div>
          <div className="slot-options">
            {options.map((o) => <Avatar key={o.id} c={o} size={48} dim={!o.owned} />)}
          </div>
          {!anyOwned && options[0] && (
            <div className="slot-hint">
              You don't have one yet. Worth getting {options[0].name} ({options[0].rarity}★).
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function TeamCard({ archetype, slots }) {
  return (
    <div className="panel">
      <h3>{archetype.name}</h3>
      <p className="desc">{archetype.description}</p>
      <div className="slots">
        {slots.map((s, i) => <Slot key={i} slot={s} />)}
      </div>
    </div>
  );
}

// 2+ characters picked
export function TeamResult({ match }) {
  const warn = match.roleConflict?.conflict && match.type !== 'none' && (
    <p className="note warn">⚠ {match.roleConflict.message}</p>
  );

  if (match.type === 'none') {
    return <p className="note warn">⚠ {match.reason}</p>;
  }
  if (match.type === 'ambiguous') {
    return (
      <section>
        {warn}
        <p className="note">Two comps fit your picks. Choose the one that matches your goal:</p>
        {match.options.map((o, i) => (
          <TeamCard key={i} archetype={o.archetype} slots={o.recommendedSlots} />
        ))}
      </section>
    );
  }
  return (
    <section>
      {warn}
      <TeamCard archetype={match.archetype} slots={match.recommendedSlots} />
    </section>
  );
}

// exactly 1 character picked
export function SingleView({ data }) {
  const { char, mode, teams, carries } = data;
  return (
    <section>
      <p className="note">
        <strong>{char.name}</strong>{' '}
        {mode === 'carry'
          ? 'is a damage dealer. These teams are built around them.'
          : 'is a helper. They make another character hit harder.'}
      </p>

      {mode === 'enabler' && carries.length > 0 && (
        <div className="panel">
          <h3>Who {char.name} makes stronger</h3>
          <div className="slot-options">
            {carries.map((c) => <Avatar key={c.id} c={c} size={56} dim={!c.owned} />)}
          </div>
        </div>
      )}

      {teams.length === 0 ? (
        <p className="note">No ready-made team for {char.name} yet. Pick a second character and I'll build one.</p>
      ) : (
        teams.map((t, i) => <TeamCard key={i} archetype={t.archetype} slots={t.recommendedSlots} />)
      )}
    </section>
  );
}
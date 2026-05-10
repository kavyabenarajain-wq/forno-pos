// Enhanced KDS with stations
function KdsScreen({ kdsTickets, onBump, onRecall }) {
  const [now, setNow] = React.useState(Date.now());
  const [station, setStation] = React.useState('all');
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);

  // Categorize tickets by station based on item categories
  const stationOf = (item) => {
    const cat = (window.POS_DATA.MENU.find(m => m.name === item.name) || {}).cat;
    if (['drinks','bar'].includes(cat)) return 'bar';
    if (['desserts'].includes(cat)) return 'pastry';
    if (['pizza'].includes(cat)) return 'pizza';
    if (['starters','sides'].includes(cat)) return 'cold';
    return 'grill';
  };

  const stations = [
    { id: 'all', lbl: 'All', ico: '🍽️' },
    { id: 'grill', lbl: 'Grill / Hot', ico: '🔥' },
    { id: 'pizza', lbl: 'Pizza', ico: '🍕' },
    { id: 'cold', lbl: 'Cold / Salads', ico: '🥗' },
    { id: 'pastry', lbl: 'Pastry', ico: '🍰' },
    { id: 'bar', lbl: 'Bar', ico: '🍷' },
  ];

  const filteredTickets = kdsTickets.map(t => {
    if (station === 'all') return t;
    const items = t.items.filter(it => stationOf(it) === station);
    return items.length ? { ...t, items } : null;
  }).filter(Boolean);

  const counts = {};
  stations.forEach(s => {
    if (s.id === 'all') counts[s.id] = kdsTickets.length;
    else counts[s.id] = kdsTickets.filter(t => t.items.some(it => stationOf(it) === s.id)).length;
  });

  const overdue = kdsTickets.filter(t => (now - t.firedAt) / 60000 >= 12).length;
  const avgWait = kdsTickets.length ? Math.round(kdsTickets.reduce((s, t) => s + (now - t.firedAt) / 60000, 0) / kdsTickets.length) : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--ink)' }}>
      <div className="kds-stations">
        {stations.map(s => (
          <button key={s.id} className={'kst' + (station === s.id ? ' active' : '')} onClick={() => setStation(s.id)}>
            <span>{s.ico}</span><span>{s.lbl}</span>
            {counts[s.id] > 0 && <span className="ct">{counts[s.id]}</span>}
          </button>
        ))}
        <div className="kds-summary">
          <span>Active: <b>{kdsTickets.length}</b></span>
          <span>Avg: <b>{avgWait}m</b></span>
          <span style={{ color: overdue ? 'var(--danger)' : undefined }}>Overdue: <b>{overdue}</b></span>
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'oklch(0.7 0.005 60)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>👨‍🍳</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{station === 'all' ? 'Kitchen is clear' : 'No tickets at this station'}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Send tickets from Order to see them here.</div>
          </div>
        </div>
      ) : (
        <div className="kds">
          {filteredTickets.map(t => {
            const ageMin = Math.max(0, Math.floor((now - t.firedAt) / 60000));
            const ageSec = Math.max(0, Math.floor((now - t.firedAt) / 1000) % 60);
            const ageBucket = ageMin >= 12 ? 'old' : ageMin >= 6 ? 'med' : 'new';
            return (
              <div key={t.id} className="kds-card" data-age={ageBucket}>
                <div className="kds-head">
                  <div>
                    <div className="who">{t.tableLabel}</div>
                    <div style={{ fontSize: 11, color: 'oklch(0.78 0.005 60)' }}>#{t.orderId} · {t.server}</div>
                  </div>
                  <div className="age">{String(ageMin).padStart(2,'0')}:{String(ageSec).padStart(2,'0')}</div>
                </div>
                <div className="kds-meta">
                  <span>{t.guests} guest{t.guests===1?'':'s'}</span>
                  <span>{new Date(t.firedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="kds-items">
                  {t.items.map((it, i) => (
                    <div key={i} className="it">
                      <span className="q">{it.qty}×</span>
                      <div>
                        <div>{it.name}</div>
                        {it.mods.length > 0 && <div className="mods">{it.mods.map(m => (m.kind === 'rem' ? '– ' : m.kind === 'add' ? '+ ' : '') + m.name).join(' · ')}</div>}
                        {it.notes && <div className="mods" style={{ fontStyle: 'italic' }}>“{it.notes}”</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="kds-foot">
                  <button className="recall" onClick={() => onRecall(t.id)}>Recall</button>
                  <button className="bump" onClick={() => onBump(t.id)}>Bump ✓</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.KdsScreen = KdsScreen;

// Floor plan / table map
const { TABLES, SECTION_FRAMES, fmt: tblFmt, TAX_RATE: tblTax } = window.POS_DATA;

const STATUSES = {
  open: { label: 'Open', color: 'var(--ink-3)' },
  seated: { label: 'Seated', color: 'var(--info)' },
  ordered: { label: 'In Progress', color: 'oklch(0.55 0.13 70)' },
  check: { label: 'Check Dropped', color: 'var(--accent-deep)' },
  dirty: { label: 'Bussing', color: 'var(--ink-2)' },
};

function TablesScreen({ tableState, setTableState, orders, openOrders, onOpenTable, user, bookings }) {
  const [selected, setSelected] = React.useState(null);
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const tbl = selected ? TABLES.find(t => t.id === selected) : null;
  const tblOrder = tbl ? openOrders.find(o => o.tableId === tbl.id) : null;

  // Find the next active booking for each table (within the next 4 hours)
  const tableBookings = React.useMemo(() => {
    const map = {};
    if (!bookings) return map;
    const cutoff = now + 4 * 60 * 60 * 1000;
    bookings.forEach(b => {
      if (b.status !== 'confirmed' && b.status !== 'pending' && b.status !== 'seated') return;
      if (b.arrivalAt > cutoff || b.arrivalAt < now - 60 * 60 * 1000) return;
      const cur = map[b.tableId];
      if (!cur || b.arrivalAt < cur.arrivalAt) map[b.tableId] = b;
    });
    return map;
  }, [bookings, now]);

  const tblBooking = tbl ? tableBookings[tbl.id] : null;

  const setStatus = (id, status) => setTableState(s => ({ ...s, [id]: { ...(s[id] || {}), status } }));

  return (
    <div className="tables-screen">
      <div className="floor">
        <div className="floor-inner">
          {SECTION_FRAMES.map(s => (
            <React.Fragment key={s.name}>
              <div className="section-frame" style={{ left: s.x, top: s.y, width: s.w, height: s.h }} />
              <div className="section-label" style={{ left: s.x + 14, top: s.y - 10 }}>{s.name}</div>
            </React.Fragment>
          ))}
          {TABLES.map(t => {
            const st = (tableState[t.id] && tableState[t.id].status) || 'open';
            const o = openOrders.find(x => x.tableId === t.id);
            const elapsed = (tableState[t.id] && tableState[t.id].seatedAt)
              ? Math.floor((now - tableState[t.id].seatedAt) / 60000) : 0;
            const tBooking = tableBookings[t.id];
            const minsToArrival = tBooking ? Math.round((tBooking.arrivalAt - now) / 60000) : null;
            return (
              <button
                key={t.id}
                className={'tbl ' + (t.shape === 'round' ? 'round' : '') + (selected === t.id ? ' selected' : '')}
                data-status={st}
                style={{ left: t.x, top: t.y, width: t.w, height: t.h }}
                onClick={() => setSelected(t.id)}
              >
                <div className="num">{t.id}</div>
                <div className="seats">{t.seats}p</div>
                {st !== 'open' && (
                  <div className="stat">
                    {st === 'seated' && (elapsed > 0 ? elapsed + 'm' : 'NEW')}
                    {st === 'ordered' && (o ? tblFmt(o.lines.reduce((s,l) => s + l.unit * l.qty, 0)) : 'IN')}
                    {st === 'check' && (o ? tblFmt(o.lines.reduce((s,l) => s + l.unit * l.qty, 0) * (1 + tblTax)) : '₹₹')}
                    {st === 'dirty' && 'BUS'}
                  </div>
                )}
                {tBooking && st === 'open' && (
                  <div className={'tbl-res-badge status-' + tBooking.status} title={`${tBooking.customerName} · ${tBooking.partySize}p · ${new Date(tBooking.arrivalAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}>
                    {tBooking.status === 'pending' ? '⏳' : '📅'}{' '}
                    {minsToArrival > 60 ? new Date(tBooking.arrivalAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                      : minsToArrival > 0 ? minsToArrival + 'm'
                      : 'now'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="floor-side">
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>Floor Status</div>
          <div className="legend">
            {Object.entries(STATUSES).map(([k, v]) => {
              const count = TABLES.filter(t => ((tableState[t.id] || {}).status || 'open') === k).length;
              return (
                <div key={k} className="item">
                  <span className="sw" style={{ background: 'transparent', borderColor: v.color }} />
                  {v.label} <span style={{ color: 'var(--ink-3)', marginLeft: 'auto' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {!tbl && (
          <div className="empty-state" style={{ height: 'auto', paddingTop: 30 }}>
            <div style={{ fontSize: 36 }}>🪑</div>
            <div style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Select a table</div>
            <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 220 }}>Tap a table to seat guests, view orders, or drop a check.</div>
          </div>
        )}

        {tbl && (
          <div className="tbl-detail">
            <h3>Table {tbl.id}</h3>
            <div className="sub">{tbl.section} · seats {tbl.seats} · {STATUSES[(tableState[tbl.id] && tableState[tbl.id].status) || 'open'].label}</div>

            {tblBooking && (
              <div className={'tbl-res-detail status-' + tblBooking.status}>
                <div className="tbl-res-head">
                  <span className="tbl-res-pill">{tblBooking.status === 'pending' ? '⏳ Pending' : tblBooking.status === 'confirmed' ? '📅 Reserved' : '🪑 Seated'}</span>
                  <span className="tbl-res-time">{new Date(tblBooking.arrivalAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <div className="tbl-res-name">{tblBooking.customerName} · {tblBooking.partySize}p</div>
                <div className="tbl-res-phone">📞 {tblBooking.customerPhone} · #{tblBooking.confirmationCode}</div>
                {tblBooking.notes && <div className="tbl-res-notes">"{tblBooking.notes}"</div>}
              </div>
            )}

            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              {!tblOrder && (
                <>
                  <button className="btn primary lg" onClick={() => {
                    setStatus(tbl.id, 'seated');
                    setTableState(s => ({ ...s, [tbl.id]: { ...(s[tbl.id] || {}), seatedAt: Date.now() } }));
                  }}>Seat Guests</button>
                  <button className="btn lg" onClick={() => {
                    onOpenTable(tbl);
                  }}>Start Order</button>
                </>
              )}
              {tblOrder && (
                <>
                  <div style={{ background: 'var(--bg-2)', padding: '12px 14px', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active order</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18 }}>#{tblOrder.id}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{tblOrder.lines.length} item{tblOrder.lines.length === 1 ? '' : 's'} · {tblOrder.guests} guest{tblOrder.guests === 1 ? '' : 's'}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22, marginTop: 6 }}>
                      {tblFmt(tblOrder.lines.reduce((s,l) => s + l.unit * l.qty, 0) * (1 + tblTax))}
                    </div>
                  </div>
                  <button className="btn primary lg" onClick={() => onOpenTable(tbl)}>Open Order</button>
                  <button className="btn lg" onClick={() => setStatus(tbl.id, 'check')}>Drop Check</button>
                </>
              )}
              <button className="btn" onClick={() => setStatus(tbl.id, 'dirty')}>Mark Bussing</button>
              <button className="btn" onClick={() => {
                setStatus(tbl.id, 'open');
                setTableState(s => { const n = { ...s }; delete n[tbl.id]; return n; });
              }}>Clear Table</button>
            </div>

            <div style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-3)' }}>
              <div style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>Server</div>
              {(tableState[tbl.id] && tableState[tbl.id].server) || user?.name || 'Unassigned'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.TablesScreen = TablesScreen;

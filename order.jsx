// Enhanced order screen — seats, courses, search, quick-add, recent, animations
const { CATEGORIES: oCAT, MENU: oMENU, MOD_GROUPS: oMODS, fmt: oFmt, TAX_RATE: oTAX, uid: oUid } = window.POS_DATA;

const COURSES = [
  { id: 'starter', name: 'Starters', ico: '🥗' },
  { id: 'main', name: 'Mains', ico: '🍽️' },
  { id: 'dessert', name: 'Desserts', ico: '🍰' },
  { id: 'drink', name: 'Drinks', ico: '🥤' },
];

function OrderScreen({ activeOrder, setActiveOrder, user, onSendKitchen, onPay, onSwitchTable, eightySixed, onOpenMods }) {
  const [activeCat, setActiveCat] = React.useState('starters');
  const [search, setSearch] = React.useState('');
  const [activeSeat, setActiveSeat] = React.useState('all'); // 'all' | seat number
  const [activeCourse, setActiveCourse] = React.useState('main');
  const [recentIds, setRecentIds] = React.useState([]);
  const [popLines, setPopLines] = React.useState({});

  const searchRef = React.useRef(null);
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.key === '/' || (e.metaKey && e.key === 'f') || (e.ctrlKey && e.key === 'f')) && !e.target.matches('input,textarea')) {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = React.useMemo(() => {
    // VR/3D-enabled items float to the top of every list so demo viewers
    // see the showpieces first. Array.prototype.sort is stable, so the
    // curated MENU order is preserved inside each group.
    const sortVR = (a, b) => Number(!!window.POS_DATA.modelFor(b.id)) - Number(!!window.POS_DATA.modelFor(a.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      return oMENU.filter(x => x.name.toLowerCase().includes(q) || (x.desc || '').toLowerCase().includes(q)).slice(0, 30).sort(sortVR);
    }
    return oMENU.filter(x => x.cat === activeCat).sort(sortVR);
  }, [activeCat, search]);

  const isOut = (id) => eightySixed.includes(id);

  const itemAdd = (item) => {
    if (isOut(item.id)) return;
    const groups = oMODS[item.cat];
    if (groups && groups.length) {
      onOpenMods(item, (mods, notes, qty) => addLine(item, mods, notes, qty));
    } else {
      addLine(item, [], '', 1);
    }
  };

  const addLine = (item, mods, notes, qty) => {
    const addPrice = mods.reduce((s, m) => s + (m.addPrice || 0), 0);
    const courseGuess = item.cat === 'starters' ? 'starter' : item.cat === 'desserts' ? 'dessert' : (item.cat === 'drinks' || item.cat === 'bar') ? 'drink' : 'main';
    const line = {
      lineId: oUid(),
      itemId: item.id,
      name: item.name,
      cat: item.cat,
      basePrice: item.price,
      mods, notes, qty,
      unit: item.price + addPrice,
      sent: false,
      seat: activeSeat === 'all' ? 0 : activeSeat,
      course: activeCourse || courseGuess,
    };
    setActiveOrder(o => ({ ...o, lines: [...o.lines, line] }));
    setRecentIds(r => [item.id, ...r.filter(x => x !== item.id)].slice(0, 8));
    setPopLines(p => ({ ...p, [line.lineId]: true }));
    setTimeout(() => setPopLines(p => { const n = { ...p }; delete n[line.lineId]; return n; }), 800);
  };

  const updateQty = (lineId, delta) => {
    setActiveOrder(o => ({
      ...o,
      lines: o.lines
        .map(l => l.lineId === lineId ? { ...l, qty: Math.max(0, l.qty + delta) } : l)
        .filter(l => l.qty > 0)
    }));
  };
  const removeLine = (lineId) => setActiveOrder(o => ({ ...o, lines: o.lines.filter(l => l.lineId !== lineId) }));
  const moveLineSeat = (lineId, seat) => setActiveOrder(o => ({ ...o, lines: o.lines.map(l => l.lineId === lineId ? { ...l, seat } : l) }));

  const visibleLines = activeSeat === 'all' ? activeOrder.lines : activeOrder.lines.filter(l => l.seat === activeSeat);
  const subtotal = visibleLines.reduce((s, l) => s + l.unit * l.qty, 0);
  const allSubtotal = activeOrder.lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const discount = activeOrder.discount || 0;
  const taxBase = Math.max(0, allSubtotal - discount);
  const tax = taxBase * oTAX;
  const total = taxBase + tax;

  const catCounts = React.useMemo(() => {
    const c = {}; oMENU.forEach(m => { c[m.cat] = (c[m.cat] || 0) + 1; }); return c;
  }, []);

  const recentItems = recentIds.map(id => oMENU.find(m => m.id === id)).filter(Boolean);

  // Group lines by course for ticket display
  const groupedByCourse = React.useMemo(() => {
    const g = {};
    visibleLines.forEach(l => { (g[l.course || 'main'] ||= []).push(l); });
    return g;
  }, [visibleLines]);

  // Per-seat totals
  const seatTotals = React.useMemo(() => {
    const totals = {};
    activeOrder.lines.forEach(l => { totals[l.seat || 0] = (totals[l.seat || 0] || 0) + l.unit * l.qty; });
    return totals;
  }, [activeOrder.lines]);

  return (
    <div className="order-screen">
      {/* Categories */}
      <div className="cats">
        <h3>Menu</h3>
        {oCAT.map(c => (
          <button key={c.id} className={'cat' + (activeCat === c.id && !search ? ' active' : '')} onClick={() => { setActiveCat(c.id); setSearch(''); }}>
            <span className="ico">{c.ico}</span><span>{c.name}</span><span className="count">{catCounts[c.id] || 0}</span>
          </button>
        ))}
        {recentItems.length > 0 && (
          <>
            <h3 style={{ marginTop: 14 }}>Recent</h3>
            {recentItems.slice(0, 5).map(item => (
              <button key={item.id} className="cat" onClick={() => itemAdd(item)} style={{ fontSize: 12 }}>
                <span className="ico">{item.swatch}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{item.name}</span>
                <span className="mono" style={{ fontSize: 11 }}>{oFmt(item.price)}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Menu grid */}
      <div className="menu-area">
        <div className="menu-toolbar">
          <div className="search">
            <span className="ico">🔍</span>
            <input ref={searchRef} placeholder="Search menu …  press / to focus" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="quickbar">
            <span style={{ fontSize: 11, color: 'var(--ink-3)', padding: '0 4px', fontWeight: 600 }}>COURSE</span>
            {COURSES.map(c => (
              <button key={c.id} className={activeCourse === c.id ? 'active' : ''} onClick={() => setActiveCourse(c.id)}>
                <span>{c.ico}</span><span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="menu-grid">
          {filtered.map(item => {
            const out = isOut(item.id) || item.out;
            return (
              <button key={item.id} className={'menu-item' + (out ? ' out' : '')} onClick={() => itemAdd(item)}>
                <div className="badge-row">
                  {out && <span className="b" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>86'd</span>}
                  {!out && item.popular && <span className="b pop">★ Popular</span>}
                </div>
                <div className="swatch" style={{ background: (oCAT.find(c => c.id === item.cat) || {}).color || 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 22 }}>
                  {item.swatch}
                </div>
                <div className="name">{item.name}</div>
                {item.desc && <div className="desc">{item.desc}</div>}
                <div className="price-row">
                  <span className="price">{oFmt(item.price)}</span>
                  <span className="add">+</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1', minHeight: 200 }}>
              <div style={{ fontSize: 28 }}>🔎</div><div>No items match "{search}"</div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket */}
      <div className="ticket">
        <div className="ticket-head">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2>{activeOrder.tableLabel}</h2>
              <div className="meta">
                Order <span className="mono">#{activeOrder.id}</span> · {activeOrder.server || user?.name}
              </div>
            </div>
            <button className="btn ghost" title="Switch ticket" onClick={onSwitchTable}>⇄</button>
          </div>
          <div className="row" style={{ marginTop: 8, gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Guests</div>
            <div className="guest-step">
              <button onClick={() => setActiveOrder(o => ({ ...o, guests: Math.max(1, (o.guests || 1) - 1) }))}>−</button>
              <span className="v">{activeOrder.guests || 1}</span>
              <button onClick={() => setActiveOrder(o => ({ ...o, guests: (o.guests || 1) + 1 }))}>+</button>
            </div>
            <div style={{ flex: 1 }} />
            <input className="guest-input" placeholder="Guest name (optional)" value={activeOrder.guestName || ''} onChange={e => setActiveOrder(o => ({ ...o, guestName: e.target.value }))} />
          </div>
        </div>

        {/* Seat tabs */}
        <div className="seat-tabs">
          <button className={'seat-tab' + (activeSeat === 'all' ? ' active' : '')} onClick={() => setActiveSeat('all')}>
            All <span className="ct">{activeOrder.lines.length}</span>
          </button>
          {Array.from({ length: activeOrder.guests || 1 }).map((_, i) => {
            const seatNum = i + 1;
            const ct = activeOrder.lines.filter(l => l.seat === seatNum).length;
            return (
              <button key={seatNum} className={'seat-tab' + (activeSeat === seatNum ? ' active' : '')} onClick={() => setActiveSeat(seatNum)}>
                Seat {seatNum} <span className="ct">{ct}</span>
                {seatTotals[seatNum] > 0 && <span className="price">{oFmt(seatTotals[seatNum])}</span>}
              </button>
            );
          })}
        </div>

        <div className="ticket-lines">
          {visibleLines.length === 0 && (
            <div className="ticket-empty">
              <div className="big">🧾</div>
              <div style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{activeSeat === 'all' ? 'Empty ticket' : 'No items for Seat ' + activeSeat}</div>
              <div style={{ fontSize: 12 }}>Tap menu items to add{activeSeat !== 'all' ? ' to this seat' : ''}</div>
            </div>
          )}
          {Object.entries(groupedByCourse).map(([course, lines]) => {
            const c = COURSES.find(x => x.id === course) || { name: course, ico: '•' };
            return (
              <div key={course}>
                <div className="course-divider"><span className="ico">{c.ico}</span><span>{c.name}</span></div>
                {lines.map(line => (
                  <div className={'line' + (popLines[line.lineId] ? ' pop' : '')} key={line.lineId}>
                    <div className="qty">{line.qty}</div>
                    <div>
                      <div className="name">
                        {line.name}
                        {activeSeat === 'all' && line.seat > 0 && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--ink-3)' }}>· s{line.seat}</span>}
                        {line.sent && <span style={{ marginLeft: 8, fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--ok-soft)', color: 'oklch(0.40 0.13 145)', fontWeight: 700, letterSpacing: '0.05em' }}>SENT</span>}
                      </div>
                      {line.mods.length > 0 && (
                        <div className="mods">
                          {line.mods.map((m, i) => (
                            <span key={i} className={'mod ' + (m.kind || '')}>
                              {m.kind === 'rem' ? '– ' : m.kind === 'add' ? '+ ' : '• '}{m.name}
                              {m.addPrice ? ' (' + oFmt(m.addPrice) + ')' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {line.notes && <div className="mods" style={{ fontStyle: 'italic' }}>“{line.notes}”</div>}
                      <div className="actions">
                        <button onClick={() => updateQty(line.lineId, -1)}>−</button>
                        <button onClick={() => updateQty(line.lineId, 1)}>+</button>
                        {(activeOrder.guests || 1) > 1 && (
                          <select value={line.seat || 0} onChange={e => moveLineSeat(line.lineId, parseInt(e.target.value))} style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, background: 'var(--bg-2)', border: 0, color: 'var(--ink-2)' }}>
                            <option value={0}>Shared</option>
                            {Array.from({ length: activeOrder.guests || 1 }).map((_, i) => <option key={i+1} value={i+1}>Seat {i+1}</option>)}
                          </select>
                        )}
                        <button className="del" onClick={() => removeLine(line.lineId)}>Void</button>
                      </div>
                    </div>
                    <div className="price">{oFmt(line.unit * line.qty)}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="ticket-totals">
          <div className="row"><span>Subtotal{activeSeat !== 'all' ? ' (Seat ' + activeSeat + ')' : ''}</span><span>{oFmt(activeSeat === 'all' ? allSubtotal : subtotal)}</span></div>
          {discount > 0 && <div className="row"><span>Discount</span><span style={{ color: 'var(--danger)' }}>−{oFmt(discount)}</span></div>}
          <div className="row"><span>GST (5%)</span><span>{oFmt(tax)}</span></div>
          <div className="row total"><span>Total</span><span>{oFmt(total)}</span></div>
        </div>

        <div className="ticket-actions">
          <button className="btn" disabled={activeOrder.lines.length === 0} onClick={() => onSendKitchen(activeOrder)}>
            🔥 Send {activeOrder.lines.some(l => !l.sent) ? '(' + activeOrder.lines.filter(l => !l.sent).length + ')' : 'Re-fire'}
          </button>
          <button className="btn" disabled={activeOrder.lines.length === 0} onClick={() => {
            const d = prompt('Discount amount (₹)?', String(discount || 0));
            if (d !== null) setActiveOrder(o => ({ ...o, discount: Math.max(0, parseFloat(d) || 0) }));
          }}>% Discount</button>
          <button className="btn primary lg pay" disabled={activeOrder.lines.length === 0} onClick={() => onPay(activeOrder)}>
            Pay · <span className="mono" style={{ marginLeft: 6 }}>{oFmt(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.OrderScreen = OrderScreen;

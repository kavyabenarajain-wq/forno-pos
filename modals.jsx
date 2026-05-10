// Shared modals: ModifierModal, CommandPalette, ManagerPin, Receipt, EightySix
const { MOD_GROUPS: mMODS, MENU: mMENU, CATEGORIES: mCAT, fmt: mFmt } = window.POS_DATA;

function ModifierModal({ item, onClose, onAdd }) {
  const groups = mMODS[item.cat] || [];
  const [selected, setSelected] = React.useState({});
  const [notes, setNotes] = React.useState('');
  const [qty, setQty] = React.useState(1);

  const toggle = (g, o) => {
    setSelected(s => {
      const cur = s[g.id] || [];
      if (g.multi) return { ...s, [g.id]: cur.includes(o.id) ? cur.filter(x => x !== o.id) : [...cur, o.id] };
      return { ...s, [g.id]: cur[0] === o.id ? [] : [o.id] };
    });
  };
  const flat = [];
  groups.forEach(g => (selected[g.id] || []).forEach(oid => {
    const o = g.opts.find(x => x.id === oid);
    if (o) flat.push({ ...o, kind: g.id === 'remove' ? 'rem' : (g.id === 'add' || g.id === 'top' ? 'add' : 'opt'), groupId: g.id });
  }));
  const addPrice = flat.reduce((s, m) => s + (m.addPrice || 0), 0);
  const lineTotal = (item.price + addPrice) * qty;
  const allRequiredMet = groups.filter(g => g.required).every(g => (selected[g.id] || []).length > 0);

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 22 }}>{item.swatch}</div>
          <div style={{ flex: 1 }}>
            <h3>{item.name}</h3>
            {item.desc && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{item.desc}</div>}
          </div>
          <div className="mono" style={{ color: 'var(--ink-3)' }}>{mFmt(item.price)}</div>
        </div>
        <div className="modal-body">
          {groups.map(g => (
            <div key={g.id} className="mod-section">
              <h4>{g.name} {g.required && <span className="req">REQUIRED</span>}</h4>
              <div className="mod-grid">
                {g.opts.map(o => {
                  const sel = (selected[g.id] || []).includes(o.id);
                  return (
                    <button key={o.id} className={'mod-chip' + (sel ? ' selected' : '')} onClick={() => toggle(g, o)}>
                      <span>{o.name}</span>
                      {o.addPrice !== 0 && <span className="add-price">{o.addPrice > 0 ? '+' : '−'}{mFmt(Math.abs(o.addPrice))}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mod-section">
            <h4>Special instructions</h4>
            <textarea className="notes" placeholder="e.g. allergy: nuts; on the side; extra crispy…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <div className="qty-stepper">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <div className="qv">{qty}</div>
            <button onClick={() => setQty(q => q + 1)}>+</button>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary lg" disabled={!allRequiredMet} onClick={() => onAdd(flat, notes, qty)}>
            Add · <span className="mono" style={{ marginLeft: 6 }}>{mFmt(lineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CommandPalette({ onClose, onCommand }) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(0);
  const inp = React.useRef(null);
  React.useEffect(() => { inp.current?.focus(); }, []);

  const cmds = [
    { id: 'go-tables', ico: '🪑', lbl: 'Go to Floor Plan', hint: 'G T' },
    { id: 'go-order', ico: '🧾', lbl: 'Go to Order Entry', hint: 'G O' },
    { id: 'go-kds', ico: '👨‍🍳', lbl: 'Go to Kitchen Display', hint: 'G K' },
    { id: 'go-history', ico: '📋', lbl: 'Go to Order History', hint: 'G H' },
    { id: 'go-reports', ico: '📊', lbl: 'Go to Reports', hint: 'G R' },
    { id: 'walkin', ico: '➕', lbl: 'New Walk-In Order', hint: 'N' },
    { id: '86', ico: '🚫', lbl: 'Manage 86 List', hint: '8 6' },
    { id: 'mgr', ico: '🔑', lbl: 'Manager Override', hint: 'M' },
    { id: 'lock', ico: '🔒', lbl: 'Lock Station', hint: '⌘ L' },
    { id: 'reset', ico: '🔄', lbl: 'Reset Demo Data', hint: '' },
  ];
  const items = mMENU.filter(i => !q || i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6).map(i => ({
    id: 'add-' + i.id, ico: i.swatch, lbl: 'Add ' + i.name, hint: mFmt(i.price), item: i,
  }));
  const all = q ? [...cmds.filter(c => c.lbl.toLowerCase().includes(q.toLowerCase())), ...items] : cmds;

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(all.length - 1, s + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
      if (e.key === 'Enter') { e.preventDefault(); const c = all[sel]; if (c) onCommand(c); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [all, sel]);

  return (
    <div className="cmd-veil" onClick={onClose}>
      <div className="cmd" onClick={e => e.stopPropagation()}>
        <div className="cmd-input">
          <span className="ico">⌘</span>
          <input ref={inp} placeholder="Search actions, screens, menu items…" value={q} onChange={e => { setQ(e.target.value); setSel(0); }} />
          <kbd>ESC</kbd>
        </div>
        <div className="cmd-results">
          {all.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No results for "{q}"</div>}
          <div className="cmd-section">{q ? 'Results' : 'Quick actions'}</div>
          {all.map((c, i) => (
            <div key={c.id} className={'cmd-row' + (i === sel ? ' sel' : '')} onMouseEnter={() => setSel(i)} onClick={() => onCommand(c)}>
              <span className="ico">{c.ico}</span>
              <span className="lbl">{c.lbl}</span>
              {c.hint && <span className="hint">{c.hint}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ManagerPin({ title, sub, onClose, onApprove }) {
  const [pin, setPin] = React.useState('');
  const [shake, setShake] = React.useState(false);
  const tap = (k) => { if (k === 'C') setPin(''); else if (k === '<') setPin(p => p.slice(0,-1)); else if (pin.length < 4) setPin(p => p + k); };
  React.useEffect(() => {
    if (pin.length === 4) {
      if (pin === '0000') onApprove();
      else { setShake(true); setTimeout(() => { setShake(false); setPin(''); }, 400); }
    }
  }, [pin]);
  return (
    <div className="modal-veil mgr-veil" onClick={onClose}>
      <div className="modal pin-modal" onClick={e => e.stopPropagation()} style={shake ? { animation: 'shake 0.4s' } : {}}>
        <div style={{ padding: '24px 24px 0' }}>
          <h3>{title || 'Manager Approval'}</h3>
          <div className="sub">{sub || 'Enter manager PIN to continue'}</div>
          <div className="pin-display">
            {[0,1,2,3].map(i => <div key={i} className={'pin-dot' + (i < pin.length ? ' filled' : '')} />)}
          </div>
        </div>
        <div style={{ padding: '0 24px 20px' }}>
          <div className="pin-pad">
            {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} onClick={() => tap(String(n))}>{n}</button>)}
            <button className="fn" onClick={() => tap('C')}>C</button>
            <button onClick={() => tap('0')}>0</button>
            <button className="fn" onClick={() => tap('<')}>⌫</button>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Demo manager PIN: <span className="mono">0000</span></div>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ order, onClose, onEmail }) {
  const subtotal = order.lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const discount = order.discount || 0;
  const taxBase = Math.max(0, subtotal - discount);
  const tax = taxBase * window.POS_DATA.TAX_RATE;
  const tip = order.tip || 0;
  const total = order.total || (taxBase + tax + tip);
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'auto', background: 'transparent', boxShadow: 'none' }}>
        <div className="receipt">
          <h4>Wabi Sabi</h4>
          <div className="center">The Oberoi · 37-39 MG Road, Bengaluru · +91 80 2558 5858</div>
          <div className="center" style={{ fontSize: 10 }}>GSTIN: 29ABCDE1234F1Z5 · FSSAI: 10020021000123</div>
          <div className="center">{new Date(order.paidAt || Date.now()).toLocaleString()}</div>
          <hr />
          <div className="l"><span>Order</span><span>#{order.id}</span></div>
          <div className="l"><span>Table</span><span>{order.tableLabel}</span></div>
          <div className="l"><span>Server</span><span>{order.server}</span></div>
          <div className="l"><span>Guests</span><span>{order.guests}</span></div>
          <hr />
          {order.lines.map(l => (
            <div key={l.lineId}>
              <div className="l"><span>{l.qty}× {l.name}</span><span>{mFmt(l.unit * l.qty)}</span></div>
              {l.mods.length > 0 && <div className="it-mods">{l.mods.map(m => m.name).join(', ')}</div>}
            </div>
          ))}
          <hr />
          <div className="l"><span>Subtotal</span><span>{mFmt(subtotal)}</span></div>
          {discount > 0 && <div className="l"><span>Discount</span><span>−{mFmt(discount)}</span></div>}
          <div className="l"><span>GST (5%)</span><span>{mFmt(tax)}</span></div>
          {tip > 0 && <div className="l"><span>Tip</span><span>{mFmt(tip)}</span></div>}
          <div className="l tot"><span>TOTAL</span><span>{mFmt(total)}</span></div>
          <hr />
          <div className="center">Thank you for dining with us!</div>
          <div className="qr" />
          <div className="center" style={{ marginTop: 6 }}>Scan to leave a review</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn" onClick={() => alert('Receipt sent via email/SMS (demo)')}>📧 Email / SMS</button>
          <button className="btn primary" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
    </div>
  );
}

function EightySixModal({ eightySixed, setEightySixed, onClose }) {
  const grouped = {};
  mMENU.forEach(m => (grouped[m.cat] ||= []).push(m));
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
        <div className="modal-head">
          <h3>86 List · Out of Stock</h3>
          <div style={{ flex: 1 }} />
          <span className="pill"><span className="dot" />{eightySixed.length} items 86'd</span>
        </div>
        <div className="modal-body">
          {Object.entries(grouped).map(([cat, items]) => {
            const c = mCAT.find(x => x.id === cat);
            return (
              <div key={cat} className="mod-section">
                <h4>{c?.ico} {c?.name}</h4>
                <div className="eighty-six">
                  {items.map(it => {
                    const on = eightySixed.includes(it.id);
                    return (
                      <div key={it.id} className="row86">
                        <span style={{ fontSize: 18 }}>{it.swatch}</span>
                        <span className="nm">{it.name}</span>
                        <span className="ct">{mFmt(it.price)}</span>
                        <button className={'tog' + (on ? ' on' : '')} onClick={() => setEightySixed(s => on ? s.filter(x => x !== it.id) : [...s, it.id])} title={on ? '86d — tap to re-enable' : 'In stock'} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-3)' }}>86'd items show as unavailable on the menu and won't be added to tickets.</div>
          <button className="btn" onClick={() => setEightySixed([])}>Clear all</button>
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

window.ModifierModal = ModifierModal;
window.CommandPalette = CommandPalette;
window.ManagerPin = ManagerPin;
window.ReceiptModal = ReceiptModal;
window.EightySixModal = EightySixModal;

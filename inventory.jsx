// Inventory module — stock levels, low-stock alerts, supplier reorder list,
// AI-generated reorder recommendations. Stock is depleted automatically when
// orders fire to KDS via consumeForOrder() in app.jsx.

const { INVENTORY_BASELINE: invBASE, RECIPES: invRECIPES, MENU: invMENU, fmt: invFmt } = window.POS_DATA;

const CAT_LABELS = {
  protein: { label: 'Proteins', ico: '🍗', color: 'oklch(0.78 0.15 30)' },
  dairy: { label: 'Dairy', ico: '🥛', color: 'oklch(0.86 0.07 90)' },
  produce: { label: 'Produce', ico: '🥬', color: 'oklch(0.80 0.13 130)' },
  dry: { label: 'Dry / Pantry', ico: '🌾', color: 'oklch(0.82 0.10 80)' },
  beverage: { label: 'Beverage', ico: '🥤', color: 'oklch(0.78 0.13 240)' },
};

function InventoryScreen({ inventory, setInventory, openOrders, kdsTickets, history, activity }) {
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [showLowOnly, setShowLowOnly] = React.useState(false);
  const [aiList, setAiList] = React.useState(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);

  // Build merged rows from baseline + current inventory state
  const rows = Object.entries(invBASE).map(([name, base]) => {
    const stock = inventory[name] != null ? inventory[name] : base.stock;
    const status = stock <= 0 ? 'out' : stock < base.reorder ? 'low' : stock < base.par * 0.6 ? 'med' : 'ok';
    const pct = Math.max(0, Math.min(100, (stock / base.par) * 100));
    return { name, ...base, stock, status, pct };
  });

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.cat !== filter) return false;
    if (showLowOnly && (r.status === 'ok' || r.status === 'med')) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !r.supplier.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const order = { out: 0, low: 1, med: 2, ok: 3 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return a.name.localeCompare(b.name);
  });

  // KPIs
  const lowCount = rows.filter(r => r.status === 'low' || r.status === 'out').length;
  const totalValue = rows.reduce((s, r) => s + r.stock * r.costPer, 0);
  const fillPct = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 100;

  // Open orders + kds reserve = "committed but not yet consumed" (we already
  // deduct on KDS-fire, so this just shows what's in flight).
  const inFlight = openOrders.reduce((s, o) => s + o.lines.length, 0);

  // Build a per-supplier reorder list
  const lowRows = rows.filter(r => r.status === 'low' || r.status === 'out');
  const bySupplier = {};
  lowRows.forEach(r => {
    bySupplier[r.supplier] = bySupplier[r.supplier] || [];
    bySupplier[r.supplier].push(r);
  });

  const receive = (name, qty) => {
    setInventory(inv => ({ ...inv, [name]: (inv[name] != null ? inv[name] : invBASE[name].stock) + qty }));
  };

  const generateReorder = async () => {
    const cfg = window.AI?.getConfig?.() || {};
    if (!cfg.apiKey) {
      setAiError('Add an AI provider in Settings → AI to generate AI-driven reorder recommendations.');
      return;
    }
    setAiError(null);
    setAiBusy(true);
    setAiList(null);
    try {
      const snapshot = lowRows.map(r => ({
        ingredient: r.name, category: r.cat, stock: r.stock, par: r.par,
        reorder: r.reorder, unit: r.unit, costPer: r.costPer, supplier: r.supplier,
      }));
      const recentSold = {};
      history.forEach(h => (h.lineSnapshot || []).forEach(l => { recentSold[l.name] = (recentSold[l.name] || 0) + l.qty; }));
      const sys = 'You are a restaurant procurement advisor. Given a low-stock snapshot and what was sold recently, return strict JSON: {"items":[{"ingredient","supplier","qty","unit","estCost","reason"}, ...]}. Round qty to a sensible reorder amount. Keep reason to one short clause.';
      const user = 'Low/out items:\n' + JSON.stringify(snapshot, null, 2) + '\n\nRecent sales (item → qty today):\n' + JSON.stringify(recentSold);
      const r = await callAI({ messages: [{ role: 'user', content: user }], system: sys, json: true, maxTokens: 800 });
      const txt = (r.text || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(txt);
      const list = Array.isArray(parsed) ? parsed : (parsed.items || []);
      setAiList(list);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="inv">
      <div className="inv-head">
        <div>
          <h1>Inventory</h1>
          <div className="inv-sub">Stock levels update live as orders fire to the kitchen.</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={generateReorder} disabled={aiBusy || lowRows.length === 0}>
          {aiBusy ? <span className="cu-spin" /> : '🧠'} AI reorder list
        </button>
      </div>

      <div className="inv-kpis">
        <div className="inv-kpi">
          <div className="inv-kpi-lbl">Items tracked</div>
          <div className="inv-kpi-val">{rows.length}</div>
          <div className="inv-kpi-delta">{Object.keys(CAT_LABELS).length} categories</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-lbl">Low / out</div>
          <div className="inv-kpi-val" style={{ color: lowCount ? 'var(--danger)' : 'var(--ok)' }}>{lowCount}</div>
          <div className="inv-kpi-delta">{lowCount ? 'reorder soon' : 'all good'}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-lbl">Stock value</div>
          <div className="inv-kpi-val">{invFmt(totalValue)}</div>
          <div className="inv-kpi-delta">at cost</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-lbl">Avg fill</div>
          <div className="inv-kpi-val">{fillPct}%</div>
          <div className="inv-kpi-delta">of par level · {inFlight} lines in flight</div>
        </div>
      </div>

      <div className="inv-toolbar">
        <div className="inv-search">
          <span className="ico">🔍</span>
          <input placeholder="Search ingredient or supplier…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="inv-filters">
          <button className={'inv-fltr' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>All</button>
          {Object.entries(CAT_LABELS).map(([id, c]) => (
            <button key={id} className={'inv-fltr' + (filter === id ? ' on' : '')} onClick={() => setFilter(id)}>
              <span>{c.ico}</span><span>{c.label}</span>
            </button>
          ))}
        </div>
        <label className="inv-lowtog">
          <input type="checkbox" checked={showLowOnly} onChange={e => setShowLowOnly(e.target.checked)} />
          <span>Low &amp; out only</span>
        </label>
      </div>

      <div className="inv-grid">
        <div className="inv-panel inv-table-panel">
          <div className="inv-row hd">
            <div>Ingredient</div>
            <div>Category</div>
            <div>Stock</div>
            <div>Par</div>
            <div>Cost</div>
            <div>Supplier</div>
            <div>Action</div>
          </div>
          {filtered.map(r => {
            const c = CAT_LABELS[r.cat] || { label: r.cat, ico: '·', color: 'var(--bg-2)' };
            return (
              <div key={r.name} className={'inv-row ' + r.status}>
                <div className="inv-name">
                  <span className="inv-status-dot" />
                  <span>{r.name}</span>
                </div>
                <div className="inv-catcell">
                  <span style={{ background: c.color, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{c.ico} {c.label}</span>
                </div>
                <div className="inv-stockcell">
                  <div className="inv-stock-num"><b>{r.stock.toFixed(r.unit === 'kg' && r.stock < 10 ? 2 : (r.unit === 'L' && r.stock < 10 ? 1 : 0))}</b><span> {r.unit}</span></div>
                  <div className="inv-stock-bar">
                    <div className="inv-stock-fill" style={{ width: r.pct + '%' }} />
                  </div>
                </div>
                <div className="mono">{r.par} {r.unit}</div>
                <div className="mono">{invFmt(r.costPer)}/{r.unit}</div>
                <div className="inv-supp">{r.supplier}</div>
                <div>
                  <button className="btn" onClick={() => receive(r.name, r.par - r.stock)} title={`Receive ${(r.par - r.stock).toFixed(1)} ${r.unit}`}>+ Receive</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ padding: 40 }}>
              <div style={{ fontSize: 32 }}>📦</div>
              <div style={{ fontWeight: 600, color: 'var(--ink-2)' }}>No items match this filter.</div>
            </div>
          )}
        </div>

        <div className="inv-side">
          <div className="inv-panel">
            <div className="inv-panel-head"><h3>Reorder list</h3>
              <span className="fc-badge" style={{ background: lowRows.length ? 'var(--danger-soft)' : 'var(--ok-soft)', color: lowRows.length ? 'var(--danger)' : 'var(--ok)' }}>{lowRows.length}</span>
            </div>
            {Object.keys(bySupplier).length === 0 ? (
              <div className="fc-empty"><span>✓</span><div>All stock above reorder point.</div></div>
            ) : (
              <div className="inv-supp-list">
                {Object.entries(bySupplier).map(([sup, items]) => {
                  const total = items.reduce((s, i) => s + (i.par - i.stock) * i.costPer, 0);
                  return (
                    <div key={sup} className="inv-supp-block">
                      <div className="inv-supp-head">
                        <b>{sup}</b>
                        <span>{items.length} item{items.length === 1 ? '' : 's'} · {invFmt(total)}</span>
                      </div>
                      {items.map(i => (
                        <div key={i.name} className="inv-supp-row">
                          <span className="inv-supp-dot" data-status={i.status} />
                          <span className="inv-supp-name">{i.name}</span>
                          <span className="mono inv-supp-qty">{(i.par - i.stock).toFixed(1)} {i.unit}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="inv-panel">
            <div className="inv-panel-head"><h3>AI recommendations</h3></div>
            {!aiList && !aiBusy && !aiError && (
              <div className="fc-ins-empty">
                <div style={{ fontSize: 28 }}>🧠</div>
                <div style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Ask Claude to write a reorder list</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>It'll factor today's sales and supplier lead times.</div>
              </div>
            )}
            {aiBusy && <div className="fc-ins-empty"><div className="cu-spin" /> Thinking…</div>}
            {aiError && <div className="fc-ins-error">{aiError}</div>}
            {aiList && (
              <div className="inv-ai-list">
                {aiList.map((r, i) => (
                  <div key={i} className="inv-ai-row">
                    <div>
                      <div className="inv-ai-name">{r.ingredient}</div>
                      <div className="inv-ai-reason">{r.reason}</div>
                    </div>
                    <div className="inv-ai-meta">
                      <div className="mono"><b>{r.qty} {r.unit}</b></div>
                      <div className="inv-ai-cost mono">{invFmt(r.estCost || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="inv-panel">
            <div className="inv-panel-head"><h3>Recent activity</h3>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)' }}>{activity?.length || 0} events</span>
            </div>
            {(!activity || activity.length === 0) ? (
              <div className="fc-empty"><span>·</span><div>Activity will appear here as orders fire to the kitchen.</div></div>
            ) : (
              <div className="inv-activity">
                {activity.slice(0, 12).map((a, i) => <InvActivityRow key={i} a={a} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// One activity row — shows the order summary + tap to expand the full
// ingredient breakdown so staff can verify deduction matches the order.
function InvActivityRow({ a }) {
  const [open, setOpen] = React.useState(false);
  const detailed = a.consumed && a.consumed.length > 0;
  const time = new Date(a.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <div className={'inv-act ' + a.kind + (open ? ' open' : '')}>
      <button
        type="button"
        className="inv-act-bar"
        onClick={() => detailed && setOpen(o => !o)}
        title={detailed ? (open ? 'Collapse' : 'Tap to see breakdown') : ''}
        disabled={!detailed}
      >
        <span className="inv-act-ico">{a.kind === 'consume' ? '−' : '+'}</span>
        <div className="inv-act-main">
          <div className="inv-act-headline">
            {a.orderId
              ? <>
                  <b>#{a.orderId}</b>
                  {a.source === 'customer' && <span className="cust-badge" style={{ marginLeft: 6 }}>📱</span>}
                  {a.tableLabel && <span style={{ color: 'var(--ink-3)', marginLeft: 6 }}> · {a.tableLabel}</span>}
                </>
              : a.text}
          </div>
          {a.itemSummary && <div className="inv-act-sub">{a.itemSummary}</div>}
        </div>
        <span className="inv-act-time">{time}</span>
        {detailed && <span className="inv-act-chevron">{open ? '▾' : '▸'}</span>}
      </button>

      {open && detailed && (
        <div className="inv-act-detail">
          <div className="inv-act-detail-head">
            <span>Ingredient consumed</span>
            <span style={{ textAlign: 'right' }}>Used</span>
            <span style={{ textAlign: 'right' }}>Remaining</span>
          </div>
          {a.consumed.map(c => {
            const par = c.par || 0;
            const pct = par > 0 ? Math.max(0, Math.min(100, ((c.remaining ?? 0) / par) * 100)) : 0;
            const low = par > 0 && (c.remaining ?? 0) < par * 0.2;
            return (
              <div key={c.ing} className={'inv-act-line' + (low ? ' low' : '')}>
                <span className="inv-act-ing">{c.ing}</span>
                <span className="mono">{c.qty.toFixed(c.unit === 'kg' && c.qty < 10 ? 3 : 2)} {c.unit}</span>
                <span className="mono inv-act-rem">
                  {c.remaining != null ? c.remaining.toFixed(c.unit === 'kg' && c.remaining < 10 ? 2 : 1) : '—'} {c.unit}
                  {par > 0 && <span className="inv-act-pct"> ({Math.round(pct)}% par)</span>}
                </span>
              </div>
            );
          })}
          {a.skipped && a.skipped.length > 0 && (
            <div className="inv-act-warn">⚠ No recipe for: {a.skipped.join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
}

window.InventoryScreen = InventoryScreen;
window.InvActivityRow = InvActivityRow;

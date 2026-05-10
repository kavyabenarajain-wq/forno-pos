// Order history + reports — all derived from real data
const { fmt: hFmt } = window.POS_DATA;

function HistoryScreen({ history }) {
  const [filter, setFilter] = React.useState('all');
  const rows = filter === 'all' ? history : history.filter(h => h.status === filter);

  const exportCsv = () => {
    if (history.length === 0) return;
    const head = 'Order,Table,Server,Items,Method,Time,Total\n';
    const body = history.map(r => [r.id, r.table, r.server, r.items, r.method, r.time, r.total].join(',')).join('\n');
    const blob = new Blob([head + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orders-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="history">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Order History</h1>
        <span className="pill"><span className="dot" /> {history.length} order{history.length===1?'':'s'} today</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', padding: 3, borderRadius: 'var(--r-md)' }}>
          {['all','paid','open','void'].map(f => (
            <button key={f} className="ticket-tab" style={{
              background: filter === f ? 'var(--surface)' : 'transparent',
              color: filter === f ? 'var(--ink)' : 'var(--ink-2)',
              boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
              textTransform: 'capitalize', padding: '6px 16px',
            }} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <button className="btn" onClick={exportCsv} disabled={history.length === 0}>📤 Export CSV</button>
      </div>

      <div className="hist-table">
        <div className="hist-row hd">
          <div>Order #</div>
          <div>Table</div>
          <div>Server</div>
          <div>Items</div>
          <div>Method</div>
          <div>Time</div>
          <div style={{ textAlign: 'right' }}>Total</div>
        </div>
        {rows.map(r => (
          <div key={r.id} className="hist-row">
            <div className="id">#{r.id}</div>
            <div>{r.table}</div>
            <div>{r.server}</div>
            <div>{r.items}</div>
            <div><span className={'stat ' + r.status}>{r.status === 'paid' ? r.method : r.status.toUpperCase()}</span></div>
            <div style={{ color: 'var(--ink-3)' }}>{r.time}</div>
            <div className="total">{hFmt(r.total)}</div>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 36 }}>📋</div>
            <div style={{ marginTop: 8, fontWeight: 600, color: 'var(--ink-2)' }}>{history.length === 0 ? 'No orders yet' : 'No orders match this filter'}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{history.length === 0 ? 'Closed orders will appear here.' : 'Try a different filter above.'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportsScreen({ history }) {
  const paidOrders = history.filter(h => h.status === 'paid');
  const totalSales = paidOrders.reduce((s, h) => s + h.total, 0);
  const orderCount = paidOrders.length;
  const avgCheck = orderCount ? totalSales / orderCount : 0;
  const guestCount = paidOrders.reduce((s, h) => s + (h.guests || 1), 0);
  const voidCount = history.filter(h => h.status === 'void').length;

  // Hourly breakdown — bucket paidOrders by hour-of-day if we have paidAt timestamps; otherwise empty
  const hours = ['10','11','12','13','14','15','16','17','18','19','20','21','22'];
  const hourly = Array(hours.length).fill(0);
  paidOrders.forEach(o => {
    // parse o.time like "2:18 PM" — best effort
    const m = (o.time || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const ap = (m[3] || '').toUpperCase();
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      const idx = hours.indexOf(String(h));
      if (idx >= 0) hourly[idx] += o.total;
    }
  });
  const maxHr = Math.max(1, ...hourly);
  const peakIdx = hourly.indexOf(Math.max(...hourly));

  // Top items from order line history (we store items count only; we can't reconstruct without lines)
  // So derive from paidOrders.lines if present
  const itemTally = {};
  paidOrders.forEach(o => {
    (o.lineSnapshot || []).forEach(l => {
      const k = l.name;
      itemTally[k] = itemTally[k] || { name: k, qty: 0, rev: 0 };
      itemTally[k].qty += l.qty;
      itemTally[k].rev += l.unit * l.qty;
    });
  });
  const mix = Object.values(itemTally).sort((a,b) => b.qty - a.qty).slice(0, 8);

  // Tender mix
  const tenderTotals = {};
  paidOrders.forEach(o => { tenderTotals[o.method] = (tenderTotals[o.method] || 0) + o.total; });
  const tenderEntries = Object.entries(tenderTotals).sort((a,b) => b[1] - a[1]);
  const tenderColors = ['var(--accent)', 'var(--ok)', 'var(--info)', 'oklch(0.55 0.13 280)', 'var(--ink-3)', 'oklch(0.65 0.15 200)'];
  let acc = 0;
  const conicSegs = tenderEntries.map(([m, v], i) => {
    const start = acc / (totalSales || 1) * 100;
    acc += v;
    const end = acc / (totalSales || 1) * 100;
    return `${tenderColors[i % tenderColors.length]} ${start}% ${end}%`;
  });
  const conicBg = totalSales > 0 ? `conic-gradient(${conicSegs.join(', ')})` : 'var(--bg-2)';

  // Server performance
  const serverTally = {};
  paidOrders.forEach(o => {
    serverTally[o.server] = serverTally[o.server] || { name: o.server, orders: 0, sales: 0 };
    serverTally[o.server].orders += 1;
    serverTally[o.server].sales += o.total;
  });
  const servers = Object.values(serverTally).sort((a,b) => b.sales - a.sales);

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className="reports">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>End-of-Day Report</h1>
        <span className="pill"><span className="dot" /> Live · {today}</span>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => window.print()}>🖨 Print Z-Report</button>
        <button className="btn primary" disabled={orderCount === 0}>Close Shift</button>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="lbl">Net Sales</div><div className="val">{hFmt(totalSales)}</div><div className="delta">{orderCount === 0 ? 'No sales yet' : 'Today'}</div></div>
        <div className="kpi"><div className="lbl">Orders</div><div className="val">{orderCount}</div><div className="delta">{voidCount > 0 ? voidCount + ' voided' : 'No voids'}</div></div>
        <div className="kpi"><div className="lbl">Avg Check</div><div className="val">{hFmt(avgCheck)}</div><div className="delta">{orderCount ? 'Per order' : '—'}</div></div>
        <div className="kpi"><div className="lbl">Guests</div><div className="val">{guestCount}</div><div className="delta">{guestCount ? hFmt(guestCount ? totalSales/guestCount : 0) + ' / guest' : '—'}</div></div>
      </div>

      {orderCount === 0 ? (
        <div className="panel" style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
          <div style={{ fontSize: 48 }}>📊</div>
          <div style={{ marginTop: 8, fontSize: 16, fontWeight: 600, color: 'var(--ink-2)' }}>Reports populate as you close orders</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Take orders and complete payments — sales charts, top items, tender mix, and server performance all appear here automatically.</div>
        </div>
      ) : (
        <div className="panel-grid">
          <div className="panel">
            <h3>Sales by Hour</h3>
            <div className="bar-chart">
              {hourly.map((v, i) => (
                <div key={i} className="bar-col">
                  <div className="bar" style={{ height: (v / maxHr * 100) + '%' }} />
                  <div className="lbl">{(parseInt(hours[i],10) > 12 ? parseInt(hours[i],10) - 12 : hours[i]) + (parseInt(hours[i],10) >= 12 ? 'p' : 'a')}</div>
                </div>
              ))}
            </div>
            <div className="panel-foot">{peakIdx >= 0 && hourly[peakIdx] > 0 ? `Peak: ${hours[peakIdx]}:00 · ${hFmt(hourly[peakIdx])}` : 'Distribution will appear as orders close.'}</div>
          </div>
          <div className="panel">
            <h3>Top Items</h3>
            {mix.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Item mix appears once orders are closed.</div>
            ) : (
              <div className="mix-table">
                <div className="mix-row" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  <div>Item</div><div className="qty">Qty</div><div className="rev">Revenue</div>
                </div>
                {mix.map(m => (
                  <div key={m.name} className="mix-row">
                    <div>{m.name}</div>
                    <div className="qty">{m.qty}</div>
                    <div className="rev">{hFmt(m.rev)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel">
            <h3>Tender Mix</h3>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 140, height: 140, borderRadius: '50%', background: conicBg, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 30, borderRadius: '50%', background: 'var(--surface)', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Total</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>{hFmt(totalSales)}</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, fontSize: 13 }}>
                {tenderEntries.length === 0 && <div style={{ color: 'var(--ink-3)' }}>No tenders yet.</div>}
                {tenderEntries.map(([m, v], i) => (
                  <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, background: tenderColors[i % tenderColors.length], borderRadius: 2, marginRight: 6 }} />{m}</span>
                    <span className="mono">{Math.round(v / totalSales * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel">
            <h3>Server Performance</h3>
            {servers.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Server tallies appear once orders close.</div>
            ) : (
              <div className="mix-table">
                {servers.map(s => (
                  <div key={s.name} className="mix-row">
                    <div>{s.name}</div>
                    <div className="qty">{s.orders} order{s.orders===1?'':'s'}</div>
                    <div className="rev">{hFmt(s.sales)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

window.HistoryScreen = HistoryScreen;
window.ReportsScreen = ReportsScreen;

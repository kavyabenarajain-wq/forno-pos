// Demand forecasting — staff-side strategic view.
// Combines a deterministic baseline (typical-day curves) with live actuals
// from openOrders + history to project end-of-day revenue, hour-by-hour
// demand, item-level stockout risk, and staffing recommendations.
// Optional Claude pass produces a plain-English insights paragraph.

const { MENU: fcMENU, CATEGORIES: fcCAT, HOUR_DEMAND: fcHOURS, DOW_FACTOR: fcDOW,
  BASELINE_COVERS_PER_DAY: fcBASE, AVG_CHECK: fcAVG, CAT_SHARE: fcCAT_SHARE,
  fmt: fcFmt, TAX_RATE: fcTAX, meta: fcMeta } = window.POS_DATA;

function ForecastScreen({ openOrders, history, kdsTickets, eightySixed, setEightySixed }) {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const [aiInsights, setAiInsights] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);

  // ── Baseline forecast for today ─────────────────────────────────────────
  const dow = now.getDay();
  const dowFactor = fcDOW[dow] || 1;
  const expectedCovers = Math.round(fcBASE * dowFactor);

  const hours = Array.from({ length: 14 }, (_, i) => i + 10); // 10am..11pm
  const totalWeight = hours.reduce((s, h) => s + (fcHOURS[h] || 0), 0);

  // ── Actuals so far ──────────────────────────────────────────────────────
  const actualByHour = Array(hours.length).fill(0);
  const actualOrdersByHour = Array(hours.length).fill(0);

  history.forEach(h => {
    const m = (h.time || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return;
    let hh = parseInt(m[1], 10);
    const ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && hh < 12) hh += 12;
    if (ap === 'AM' && hh === 12) hh = 0;
    const idx = hours.indexOf(hh);
    if (idx >= 0) {
      actualByHour[idx] += h.total;
      actualOrdersByHour[idx] += 1;
    }
  });
  const liveSubtotal = openOrders.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.unit * l.qty, 0), 0);
  const liveTotal = liveSubtotal * (1 + fcTAX);
  const currentHour = now.getHours();
  const currentIdx = hours.indexOf(currentHour);
  if (currentIdx >= 0) actualByHour[currentIdx] += liveTotal;

  const actualSoFar = actualByHour.reduce((s, v) => s + v, 0);
  const liveOrders = openOrders.length;

  // ── Forecast curve (baseline scaled by day; adapts to actuals via pace) ─
  const expectedRevenue = expectedCovers * fcAVG;
  // Adapt: if we're tracking ahead/behind so far, scale rest of day
  const completedWeight = hours.slice(0, Math.max(0, currentIdx + 1)).reduce((s, h, i) => s + (fcHOURS[hours[i]] || 0), 0);
  const expectedSoFar = expectedRevenue * (completedWeight / totalWeight);
  const paceRatio = expectedSoFar > 0 ? actualSoFar / expectedSoFar : 1;
  const adjustedFactor = paceRatio > 0.2 ? Math.max(0.7, Math.min(1.5, paceRatio)) : 1;

  const forecastByHour = hours.map(h => (fcHOURS[h] || 0) / totalWeight * expectedRevenue * adjustedFactor);
  const projectedTotal = forecastByHour.reduce((s, v, i) => s + (i <= currentIdx ? Math.max(actualByHour[i], v * 0.9) : v), 0);

  const peakIdx = forecastByHour.indexOf(Math.max(...forecastByHour));
  const remainingForecast = forecastByHour.slice(currentIdx + 1).reduce((s, v) => s + v, 0);

  // ── Item-level forecast ─────────────────────────────────────────────────
  // Distribute expected covers across categories, then within category by
  // each item's popularity prior (popular items get 2× weight).
  const itemForecasts = React.useMemo(() => {
    const expectedRemainingCovers = Math.round(expectedCovers * (remainingForecast / Math.max(1, expectedRevenue)));
    const byCat = {};
    fcMENU.forEach(it => {
      const w = it.popular ? 2 : 1;
      byCat[it.cat] = byCat[it.cat] || { items: [], weight: 0 };
      byCat[it.cat].items.push({ item: it, w });
      byCat[it.cat].weight += w;
    });
    const out = [];
    Object.entries(byCat).forEach(([cat, { items, weight }]) => {
      const catShare = fcCAT_SHARE[cat] || 0.05;
      const catCovers = expectedRemainingCovers * catShare;
      items.forEach(({ item, w }) => {
        const expected = +(catCovers * (w / weight)).toFixed(1);
        // soldSoFar from history snapshots
        let sold = 0;
        history.forEach(h => (h.lineSnapshot || []).forEach(l => { if (l.name === item.name) sold += l.qty; }));
        openOrders.forEach(o => o.lines.forEach(l => { if (l.itemId === item.id) sold += l.qty; }));
        out.push({ item, sold, expected, total: sold + expected });
      });
    });
    return out.sort((a, b) => b.total - a.total);
  }, [history, openOrders, expectedCovers, remainingForecast, expectedRevenue]);

  const topItems = itemForecasts.slice(0, 8);
  const stockAlerts = itemForecasts
    .filter(f => f.expected >= 4 && !eightySixed.includes(f.item.id))
    .slice(0, 5)
    .map(f => ({ ...f, risk: f.expected >= 8 ? 'high' : 'med' }));

  // ── Staffing ────────────────────────────────────────────────────────────
  // Rule of thumb: 1 server per 4 covers / hour, 1 cook per 8 covers / hour.
  const staffByHour = hours.map((h, i) => {
    const covers = forecastByHour[i] / fcAVG;
    return {
      hour: h,
      covers: Math.round(covers),
      servers: Math.max(2, Math.ceil(covers / 4)),
      cooks: Math.max(2, Math.ceil(covers / 8)),
    };
  });
  const peakStaff = staffByHour[peakIdx];

  // ── AI insights ─────────────────────────────────────────────────────────
  const generateInsights = async () => {
    const cfg = window.AI?.getConfig?.() || {};
    if (!cfg.apiKey) {
      setAiError('Add an AI provider in Settings → AI to get plain-English insights. (Forecast charts work without one.)');
      setAiInsights(null);
      return;
    }
    setAiError(null);
    setAiLoading(true);
    setAiInsights(null);
    try {
      const summary = {
        date: now.toISOString().slice(0, 10),
        dayOfWeek: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow],
        currentHour,
        expectedRevenue: Math.round(expectedRevenue),
        projectedTotal: Math.round(projectedTotal),
        actualSoFar: Math.round(actualSoFar),
        paceVsTypical: Math.round((paceRatio - 1) * 100) + '%',
        peakHour: hours[peakIdx],
        peakRevenue: Math.round(forecastByHour[peakIdx]),
        liveOpenOrders: liveOrders,
        topPredictedItems: topItems.slice(0, 5).map(t => ({ name: t.item.name, predicted: t.expected, soldSoFar: t.sold })),
        stockAlerts: stockAlerts.map(s => ({ name: s.item.name, expected: s.expected, risk: s.risk })),
        peakStaff: peakStaff && { hour: peakStaff.hour, covers: peakStaff.covers, servers: peakStaff.servers, cooks: peakStaff.cooks },
      };
      const sys = 'You are a restaurant operations advisor. Given a forecast snapshot, return strict JSON: {"insights":["<insight 1>", ...]} with 3-5 short, specific, actionable insights for the floor manager. Concrete numbers. No fluff. No headings.';
      const user = 'Forecast snapshot:\n' + JSON.stringify(summary, null, 2);
      const r = await callAI({ messages: [{ role: 'user', content: user }], system: sys, json: true, maxTokens: 700 });
      const txt = (r.text || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      let parsed;
      try { parsed = JSON.parse(txt); } catch { parsed = { insights: txt.split('\n').filter(l => l.trim()) }; }
      const list = Array.isArray(parsed) ? parsed : (parsed.insights || []);
      setAiInsights(list);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const maxCurve = Math.max(...forecastByHour, ...actualByHour, 1);

  return (
    <div className="forecast">
      <div className="fc-head">
        <div>
          <h1>Demand Forecast</h1>
          <div className="fc-sub">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow]} · {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · live updates from POS &amp; KDS</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => generateInsights()} disabled={aiLoading}>
          {aiLoading ? <span className="cu-spin" /> : '🧠'} Generate AI insights
        </button>
      </div>

      <div className="fc-kpis">
        <div className="fc-kpi">
          <div className="fc-kpi-lbl">Projected today</div>
          <div className="fc-kpi-val">{fcFmt(projectedTotal)}</div>
          <div className="fc-kpi-delta" style={{ color: paceRatio >= 1 ? 'var(--ok)' : 'var(--warn)' }}>
            {paceRatio >= 1 ? '▲' : '▼'} {Math.round(Math.abs(paceRatio - 1) * 100)}% vs typical
          </div>
        </div>
        <div className="fc-kpi">
          <div className="fc-kpi-lbl">Booked so far</div>
          <div className="fc-kpi-val">{fcFmt(actualSoFar)}</div>
          <div className="fc-kpi-delta">{liveOrders} open · {history.length} closed</div>
        </div>
        <div className="fc-kpi">
          <div className="fc-kpi-lbl">Peak hour</div>
          <div className="fc-kpi-val">{hours[peakIdx]}:00</div>
          <div className="fc-kpi-delta">{fcFmt(forecastByHour[peakIdx])} forecast</div>
        </div>
        <div className="fc-kpi">
          <div className="fc-kpi-lbl">Stock at risk</div>
          <div className="fc-kpi-val" style={{ color: stockAlerts.length ? 'var(--warn)' : 'var(--ok)' }}>{stockAlerts.length}</div>
          <div className="fc-kpi-delta">items predicted to run low</div>
        </div>
      </div>

      <div className="fc-grid">
        <div className="fc-panel fc-chart-panel">
          <div className="fc-panel-head">
            <h3>Demand curve · forecast vs actual</h3>
            <div className="fc-legend">
              <span><i style={{ background: 'var(--accent)' }} /> Forecast</span>
              <span><i style={{ background: 'var(--ok)' }} /> Actual</span>
              <span><i style={{ background: 'var(--ink)', opacity: 0.4 }} /> Now</span>
            </div>
          </div>
          <div className="fc-chart">
            {hours.map((h, i) => {
              const fH = (forecastByHour[i] / maxCurve) * 100;
              const aH = (actualByHour[i] / maxCurve) * 100;
              const isPast = i < currentIdx;
              const isNow = i === currentIdx;
              return (
                <div key={h} className={'fc-col' + (isNow ? ' now' : '') + (i === peakIdx ? ' peak' : '')}>
                  <div className="fc-bars">
                    <div className="fc-bar fc-bar-forecast" style={{ height: fH + '%' }} title={fcFmt(forecastByHour[i])} />
                    {(isPast || isNow) && <div className="fc-bar fc-bar-actual" style={{ height: aH + '%' }} title={fcFmt(actualByHour[i])} />}
                  </div>
                  <div className="fc-x">{h > 12 ? (h - 12) + 'p' : h === 12 ? '12p' : h + 'a'}</div>
                </div>
              );
            })}
          </div>
          <div className="fc-chart-foot">
            <div>Peak <b>{hours[peakIdx]}:00</b> · {fcFmt(forecastByHour[peakIdx])}</div>
            <div>Remaining today: <b>{fcFmt(remainingForecast)}</b></div>
            <div>Pace: <b style={{ color: paceRatio >= 1 ? 'var(--ok)' : 'var(--warn)' }}>{paceRatio >= 1 ? '+' : ''}{Math.round((paceRatio - 1) * 100)}%</b></div>
          </div>
        </div>

        <div className="fc-panel">
          <div className="fc-panel-head"><h3>AI insights</h3></div>
          {!aiInsights && !aiLoading && !aiError && (
            <div className="fc-ins-empty">
              <div style={{ fontSize: 32 }}>🧠</div>
              <div style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Tap "Generate AI insights" above</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>Claude will read this snapshot and suggest specific actions.</div>
            </div>
          )}
          {aiLoading && <div className="fc-ins-empty"><div className="cu-spin" /> Thinking…</div>}
          {aiError && <div className="fc-ins-error">{aiError}</div>}
          {aiInsights && (
            <ul className="fc-ins">
              {aiInsights.map((line, i) => (
                <li key={i}><span className="fc-ins-dot">▸</span><span>{typeof line === 'string' ? line : JSON.stringify(line)}</span></li>
              ))}
            </ul>
          )}
        </div>

        <div className="fc-panel">
          <div className="fc-panel-head"><h3>Stock alerts</h3>
            <span className="fc-badge">{stockAlerts.length}</span>
          </div>
          {stockAlerts.length === 0 ? (
            <div className="fc-empty"><span>✓</span><div>No items at risk right now.</div></div>
          ) : (
            <div className="fc-stock">
              {stockAlerts.map(s => (
                <div key={s.item.id} className={'fc-stock-row ' + (s.risk === 'high' ? 'high' : 'med')}>
                  <div className="fc-stock-emoji">{s.item.swatch}</div>
                  <div style={{ flex: 1 }}>
                    <div className="fc-stock-name">{s.item.name}</div>
                    <div className="fc-stock-sub">expected {Math.round(s.expected)} more · {s.sold} sold</div>
                  </div>
                  <button className="btn" onClick={() => setEightySixed(x => x.includes(s.item.id) ? x : [...x, s.item.id])} title="Mark as 86 (out of stock)">86</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fc-panel">
          <div className="fc-panel-head"><h3>Top predicted items · rest of day</h3></div>
          <div className="fc-items">
            {topItems.map((t, i) => {
              const max = topItems[0]?.total || 1;
              const w = (t.total / max) * 100;
              return (
                <div key={t.item.id} className="fc-item-row">
                  <div className="fc-item-rank">{i + 1}</div>
                  <div className="fc-item-emoji">{t.item.swatch}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fc-item-name">{t.item.name}</div>
                    <div className="fc-item-bar"><div className="fc-item-bar-fill" style={{ width: w + '%' }} /></div>
                  </div>
                  <div className="fc-item-num"><b>{Math.round(t.total)}</b><span> total</span></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="fc-panel fc-staffing">
          <div className="fc-panel-head"><h3>Staffing recommendation</h3></div>
          <div className="fc-staff-grid">
            <div className="fc-staff-row hd">
              <div>Hour</div><div>Covers</div><div>Servers</div><div>Cooks</div>
            </div>
            {staffByHour.map((s, i) => (
              <div key={s.hour} className={'fc-staff-row' + (i === peakIdx ? ' peak' : '') + (i === currentIdx ? ' now' : '')}>
                <div>{s.hour}:00</div>
                <div className="mono">{s.covers}</div>
                <div className="mono">{s.servers}</div>
                <div className="mono">{s.cooks}</div>
              </div>
            ))}
          </div>
          {peakStaff && (
            <div className="fc-staff-foot">Peak {peakStaff.hour}:00 needs ≥ <b>{peakStaff.servers}</b> servers and <b>{peakStaff.cooks}</b> cooks on the floor.</div>
          )}
        </div>
      </div>
    </div>
  );
}

window.ForecastScreen = ForecastScreen;

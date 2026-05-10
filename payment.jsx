// Payment screen with split, tip, tender, numpad
const { fmt: payFmt, TAX_RATE: payTax, uid: payUid } = window.POS_DATA;

function PaymentScreen({ order, onClose, onComplete }) {
  const subtotal = order.lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const discount = order.discount || 0;
  const taxBase = Math.max(0, subtotal - discount);
  const tax = taxBase * payTax;
  const total = taxBase + tax;

  const [tipPct, setTipPct] = React.useState(0);
  const [customTip, setCustomTip] = React.useState(null);
  const [method, setMethod] = React.useState('upi');
  const [entry, setEntry] = React.useState(''); // numpad entry
  const [splits, setSplits] = React.useState([]); // {amount, method, tip}
  const [splitMode, setSplitMode] = React.useState(false);
  const [splitN, setSplitN] = React.useState(2);

  const tipAmt = customTip != null ? customTip : (taxBase * tipPct / 100);
  const grandTotal = total + tipAmt;
  const paid = splits.reduce((s, p) => s + p.amount, 0);
  const due = grandTotal - paid;

  const tap = (k) => {
    if (k === 'C') { setEntry(''); return; }
    if (k === '<') { setEntry(s => s.slice(0, -1)); return; }
    if (k === '.' && entry.includes('.')) return;
    if (entry.length > 7) return;
    setEntry(s => s + k);
  };

  const entryAmount = parseFloat(entry || '0') || 0;

  const applyPayment = (amt, m) => {
    const split = { id: payUid(), amount: amt, method: m, time: Date.now() };
    const newSplits = [...splits, split];
    setSplits(newSplits);
    setEntry('');
    const newPaid = newSplits.reduce((s, p) => s + p.amount, 0);
    if (newPaid >= grandTotal - 0.005) {
      setTimeout(() => onComplete({ ...order, splits: newSplits, tip: tipAmt, total: grandTotal, paidAt: Date.now() }), 200);
    }
  };

  const fastPay = () => applyPayment(due, method);
  const cashTender = (n) => {
    setEntry(String(n));
  };

  const evenSplit = () => {
    const each = +(grandTotal / splitN).toFixed(2);
    const arr = Array(splitN).fill(0).map((_, i) => ({ id: payUid(), amount: i === splitN - 1 ? +(grandTotal - each * (splitN - 1)).toFixed(2) : each, method: 'card', time: Date.now() }));
    setSplits(arr);
    setSplitMode(false);
    setTimeout(() => onComplete({ ...order, splits: arr, tip: tipAmt, total: grandTotal, paidAt: Date.now() }), 600);
  };

  return (
    <div className="pay-screen">
      <div className="pay-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn ghost" onClick={onClose}>← Back</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Payment</h1>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{order.tableLabel} · Order #{order.id}</div>
          </div>
        </div>

        <div className="pay-summary">
          <div className="row"><span>Subtotal</span><span>{payFmt(subtotal)}</span></div>
          {discount > 0 && <div className="row"><span>Discount</span><span style={{ color: 'var(--danger)' }}>−{payFmt(discount)}</span></div>}
          <div className="row"><span>GST (5%)</span><span>{payFmt(tax)}</span></div>
          <div className="row"><span>Tip</span><span>{payFmt(tipAmt)}</span></div>
          <div className="row t"><span>Total</span><span>{payFmt(grandTotal)}</span></div>
        </div>

        <div className="pay-section">
          <h3>Service charge / Tip</h3>
          <div className="tip-grid">
            {[0, 5, 10, 15].map(p => (
              <button key={p} className={'tip-btn' + (customTip == null && tipPct === p ? ' active' : '')} onClick={() => { setTipPct(p); setCustomTip(null); }}>
                <div className="pct">{p === 0 ? 'None' : p + '%'}</div>
                <div className="amt">{payFmt(taxBase * p / 100)}</div>
              </button>
            ))}
            <button className={'tip-btn' + (customTip != null ? ' active' : '')} onClick={() => {
              const v = prompt('Custom tip (₹)?', customTip != null ? String(customTip) : '0');
              if (v !== null) setCustomTip(Math.max(0, parseFloat(v) || 0));
            }}>
              <div className="pct" style={{ fontSize: 13 }}>Custom</div>
              <div className="amt">{customTip != null ? payFmt(customTip) : '—'}</div>
            </button>
          </div>
        </div>

        <div className="pay-section">
          <h3>Tender</h3>
          <div className="method-grid">
            {[
              { id: 'upi', ico: '📲', lbl: 'UPI / QR', sub: 'GPay, PhonePe, Paytm' },
              { id: 'card', ico: '💳', lbl: 'Credit / Debit', sub: 'Insert, swipe, or tap' },
              { id: 'cash', ico: '💵', lbl: 'Cash', sub: 'Calculate change' },
              { id: 'wallet', ico: '👛', lbl: 'Wallet', sub: 'Paytm / Amazon Pay' },
              { id: 'netbank', ico: '🏦', lbl: 'Net Banking', sub: 'Direct transfer' },
              { id: 'comp', ico: '⭐', lbl: 'Comp / House', sub: 'Manager only' },
            ].map(m => (
              <button key={m.id} className="method-btn" style={method === m.id ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}} onClick={() => setMethod(m.id)}>
                <span className="ico">{m.ico}</span>
                <span className="lbl">{m.lbl}</span>
                <span className="sub">{m.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pay-section">
          <h3>Split</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setSplitMode(s => !s)}>{splitMode ? 'Cancel split' : '👥 Split evenly'}</button>
            {splitMode && (
              <>
                <div className="qty-stepper" style={{ display: 'inline-flex', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  <button style={{ width: 36, height: 38, border: 0, background: 'var(--surface)', cursor: 'pointer' }} onClick={() => setSplitN(n => Math.max(2, n - 1))}>−</button>
                  <div style={{ width: 44, textAlign: 'center', lineHeight: '38px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{splitN}</div>
                  <button style={{ width: 36, height: 38, border: 0, background: 'var(--surface)', cursor: 'pointer' }} onClick={() => setSplitN(n => Math.min(8, n + 1))}>+</button>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>= <span className="mono">{payFmt(grandTotal / splitN)}</span> each</div>
                <button className="btn primary" onClick={evenSplit}>Apply</button>
              </>
            )}
            {!splitMode && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Or enter partial amounts on the keypad and press Charge.</div>
            )}
          </div>
          {splits.length > 0 && (
            <div style={{ marginTop: 12, background: 'var(--bg-2)', borderRadius: 'var(--r-md)', padding: 10 }}>
              {splits.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span>Payment {i + 1} · {s.method.toUpperCase()}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{payFmt(s.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pay-right">
        <h3>Amount Due</h3>
        <div className="pay-amount">
          <div className="label">Remaining</div>
          <div className="val">{payFmt(Math.max(0, due))}</div>
        </div>
        <div className="pay-amount">
          <div className="label">Entered</div>
          <div className="val entry">{entry ? payFmt(entryAmount) : payFmt(0)}</div>
          {method === 'cash' && entryAmount >= due && due > 0 && (
            <div style={{ fontSize: 13, color: 'var(--ok)', marginTop: 6 }}>Change due: <span className="mono" style={{ fontWeight: 700 }}>{payFmt(entryAmount - due)}</span></div>
          )}
        </div>

        {method === 'cash' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
            {[100, 200, 500, 1000, 2000, Math.ceil(due / 100) * 100].map((n, i) => (
              <button key={i} className="btn" style={{ background: 'oklch(0.30 0.012 60)', color: 'white', border: 0 }} onClick={() => cashTender(n)}>₹{n.toLocaleString('en-IN')}</button>
            ))}
          </div>
        )}

        <div className="numpad">
          {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} onClick={() => tap(String(n))}>{n}</button>)}
          <button className="fn" onClick={() => tap('.')}>.</button>
          <button onClick={() => tap('0')}>0</button>
          <button className="fn" onClick={() => tap('<')}>⌫</button>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn" style={{ background: 'oklch(0.30 0.012 60)', color: 'white', border: 0 }} onClick={() => setEntry('')}>Clear</button>
          <button className="btn ok lg" onClick={() => entry ? applyPayment(Math.min(entryAmount, due), method) : fastPay()}>
            {entry ? 'Apply ' + payFmt(entryAmount) : 'Charge ' + payFmt(due)}
          </button>
        </div>
      </div>
    </div>
  );
}

window.PaymentScreen = PaymentScreen;

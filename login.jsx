// Login screen with staff PIN
const { useState, useEffect, useMemo, useRef, useCallback } = React;
const { STAFF } = window.POS_DATA;

function LoginScreen({ onLogin, onBackToRole }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  const tap = (k) => {
    if (k === 'C') {setPin('');return;}
    if (k === '<') {setPin((p) => p.slice(0, -1));return;}
    if (pin.length < 4) setPin((p) => p + k);
  };

  useEffect(() => {
    if (pin.length === 4 && selected) {
      if (selected.pin === pin) {
        onLogin(selected);
      } else {
        setShake(true);
        setTimeout(() => {setShake(false);setPin('');}, 400);
      }
    }
  }, [pin, selected]);

  return (
    <div className="login">
      <div className="login-card" style={shake ? { animation: 'shake 0.4s' } : {}}>
        <div className="brand">
          <div className="logo">{'WABI\nSABI'}</div>
          <div style={{ flex: 1 }}>
            <h1>Wabi Sabi</h1>
            <div className="biz">The Oberoi · Station 02</div>
          </div>
          {onBackToRole && (
            <button className="btn ghost" style={{ fontSize: 12 }} onClick={onBackToRole} title="Back to role select">⇄ Switch role</button>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 500, marginBottom: 12 }}>
          Select staff
        </div>
        <div className="staff-grid">
          {STAFF.map((s) =>
          <button
            key={s.id}
            className={'staff-btn' + (selected?.id === s.id ? ' active' : '')}
            onClick={() => {setSelected(s);setPin('');}}>
            
              <div className="av">{s.initials}</div>
              <div className="nm">{s.name}</div>
              <div className="rl">{s.role}</div>
            </button>
          )}
        </div>
        {selected &&
        <>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginBottom: 10 }}>
              Enter PIN for <b style={{ color: 'var(--ink)' }}>{selected.name}</b>
            </div>
            <div className="pin-display">
              {[0, 1, 2, 3].map((i) => <div key={i} className={'pin-dot' + (i < pin.length ? ' filled' : '')} />)}
            </div>
            <div className="pin-pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) =>
            <button key={n} onClick={() => tap(String(n))}>{n}</button>
            )}
              <button className="fn" onClick={() => tap('C')}>C</button>
              <button onClick={() => tap('0')}>0</button>
              <button className="fn" onClick={() => tap('<')}>⌫</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
              Demo PIN: <span className="mono">{selected.pin}</span>
            </div>
          </>
        }
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }`}</style>
    </div>);

}

window.LoginScreen = LoginScreen;
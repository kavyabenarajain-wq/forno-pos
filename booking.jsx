// Reservation flow — customer-side wizard + 3D floor picker + 30-min unlock gate.
// Bookings live in the same persisted blob as orders, sync across tabs via the
// storage event, and drive a "Reservations" approval queue on the staff side.

const { TABLES: bkTABLES, SECTION_FRAMES: bkFRAMES, fmt: bkFmt, uid: bkUid } = window.POS_DATA;

const SLOT_MIN = 30;            // 30-minute reservation slots
const DEFAULT_DURATION = 90;    // a booking holds the table for 90 min
const UNLOCK_BEFORE_MS = 30 * 60 * 1000; // ordering opens 30 min before arrival
const CONFLICT_BUFFER_MS = 15 * 60 * 1000; // tables flip 15 min between sittings
const OPEN_HOUR = 12;
const CLOSE_HOUR = 23;          // last seating 22:30

// Out-of-hours test slots — explicitly bookable regardless of OPEN_HOUR /
// CLOSE_HOUR / 30-min lead-time rules. Add a timestamp here to expose a slot
// for a specific demo or after-hours test.
const DEMO_SLOTS = [
  new Date(2026, 4, 10, 1, 40, 0, 0).getTime(), // 1:40 AM, 10 May 2026 (test)
];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtCountdown(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Two reservations conflict if they overlap on the same table (with buffer).
function bookingsConflict(a, b) {
  if (a.tableId !== b.tableId) return false;
  const aStart = a.arrivalAt - CONFLICT_BUFFER_MS;
  const aEnd = a.arrivalAt + (a.durationMin || DEFAULT_DURATION) * 60000 + CONFLICT_BUFFER_MS;
  const bStart = b.arrivalAt;
  const bEnd = b.arrivalAt + (b.durationMin || DEFAULT_DURATION) * 60000;
  return aStart < bEnd && bStart < aEnd;
}

// Tables that are unavailable at a given time, considering existing bookings.
function unavailableTableIds(bookings, arrivalAt, partySize, ignoreId) {
  const probe = { tableId: null, arrivalAt, durationMin: DEFAULT_DURATION };
  const taken = new Set();
  for (const b of bookings) {
    if (ignoreId && b.id === ignoreId) continue;
    if (b.status === 'declined' || b.status === 'cancelled' || b.status === 'completed') continue;
    probe.tableId = b.tableId;
    if (bookingsConflict(probe, b)) taken.add(b.tableId);
  }
  return taken;
}

window.BOOKING_UTILS = {
  SLOT_MIN, DEFAULT_DURATION, UNLOCK_BEFORE_MS, OPEN_HOUR, CLOSE_HOUR,
  fmtTime, fmtDate, fmtCountdown, makeCode, dayKey,
  bookingsConflict, unavailableTableIds,
};

// ── Customer welcome — gate before ordering / booking ─────────────────────
function CustomerWelcome({ onReserve, onLookup, onWalkIn, onBrowseMenu, onBackToRole }) {
  return (
    <div className="role-screen akane">
      <div className="role-card akane bk-welcome">
        <div className="role-logo akane-logo">{'WABI\nSABI'}</div>
        <h1 className="akane-title">Wabi Sabi</h1>
        <div className="role-tag">Welcome — how would you like to dine with us this evening?</div>
        <div className="role-grid bk-welcome-grid">
          <button className="role-btn customer" onClick={onReserve}>
            <div className="role-ico">🪑</div>
            <div className="role-name">Reserve a Table</div>
            <div className="role-sub">Pick your seat in 3D · order opens 30 min before arrival</div>
          </button>
          <button className="role-btn customer" onClick={onLookup}>
            <div className="role-ico">🎫</div>
            <div className="role-name">I have a reservation</div>
            <div className="role-sub">Look up with your confirmation code</div>
          </button>
          <button className="role-btn staff" onClick={onWalkIn}>
            <div className="role-ico">🍣</div>
            <div className="role-name">Walking in</div>
            <div className="role-sub">Skip ahead — order voice & AR menu now</div>
          </button>
          {onBrowseMenu && (
            <button className="role-btn customer" onClick={onBrowseMenu}>
              <div className="role-ico">📖</div>
              <div className="role-name">Browse the menu</div>
              <div className="role-sub">Preview only — reserve a table to order</div>
            </button>
          )}
        </div>
        <button className="btn ghost" style={{ marginTop: 18 }} onClick={onBackToRole}>⇄ Back to role select</button>
      </div>
    </div>
  );
}

// ── Reservation wizard — step 1: party + date + time ──────────────────────
function BookingStep1({ partySize, setPartySize, arrivalAt, setArrivalAt, onNext, onBack }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d.getTime();
  });

  const arrivalDate = new Date(arrivalAt || dates[0]);
  const selectedDay = dayKey(arrivalDate.getTime());

  // Generate time slots for the selected day
  const buildSlots = (dayTs) => {
    const slots = [];
    const base = new Date(dayTs); base.setHours(OPEN_HOUR, 0, 0, 0);
    const end = new Date(dayTs); end.setHours(CLOSE_HOUR, 0, 0, 0);
    const minStart = Date.now() + 30 * 60000; // can't book in past or within 30 min
    for (let t = base.getTime(); t <= end.getTime(); t += SLOT_MIN * 60000) {
      slots.push({ ts: t, disabled: t < minStart });
    }
    // Inject demo / after-hours test slots that fall on this day. Always
    // selectable regardless of past/future or open-hours rules.
    const todayKey = dayKey(dayTs);
    for (const ts of DEMO_SLOTS) {
      if (dayKey(ts) === todayKey) slots.push({ ts, disabled: false, demo: true });
    }
    slots.sort((a, b) => a.ts - b.ts);
    return slots;
  };
  const slots = buildSlots(arrivalDate.getTime());

  const setDay = (dayTs) => {
    // preserve hour/minute if already set, else default to 7pm
    const cur = arrivalAt ? new Date(arrivalAt) : null;
    const next = new Date(dayTs);
    if (cur) next.setHours(cur.getHours(), cur.getMinutes(), 0, 0);
    else next.setHours(19, 0, 0, 0);
    setArrivalAt(next.getTime());
  };

  const isDemoSlot = arrivalAt && DEMO_SLOTS.includes(arrivalAt);
  const valid = partySize >= 1 && partySize <= 12 && arrivalAt && (isDemoSlot || arrivalAt > Date.now());

  return (
    <div className="bk-step">
      <div className="bk-step-head">
        <div className="bk-step-num">1 / 3</div>
        <h2>How many, and when?</h2>
        <div className="bk-step-sub">We'll show you live availability across the floor.</div>
      </div>

      <div className="bk-section">
        <label className="bk-label">Party size</label>
        <div className="bk-party">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <button key={n} className={'bk-party-btn' + (partySize === n ? ' on' : '')} onClick={() => setPartySize(n)}>
              <div className="bk-party-n">{n}</div>
              <div className="bk-party-ico">{n === 1 ? '🧑' : n === 2 ? '👥' : '👨‍👩‍👧'}</div>
            </button>
          ))}
          <div className="bk-party-more">
            <input
              type="number" min="1" max="12"
              value={partySize}
              onChange={e => setPartySize(Math.max(1, Math.min(12, parseInt(e.target.value || 1, 10))))}
            />
            <span>guests</span>
          </div>
        </div>
      </div>

      <div className="bk-section">
        <label className="bk-label">Date</label>
        <div className="bk-dates">
          {dates.map((dts, i) => {
            const d = new Date(dts);
            const sel = dayKey(dts) === selectedDay;
            return (
              <button key={dts} className={'bk-date' + (sel ? ' on' : '')} onClick={() => setDay(dts)}>
                <div className="bk-date-d">{i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString([], { weekday: 'short' })}</div>
                <div className="bk-date-n">{d.getDate()}</div>
                <div className="bk-date-m">{d.toLocaleDateString([], { month: 'short' })}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bk-section">
        <label className="bk-label">Time</label>
        <div className="bk-times">
          {slots.map(s => {
            const sel = arrivalAt === s.ts;
            return (
              <button key={s.ts}
                className={'bk-time' + (sel ? ' on' : '') + (s.disabled ? ' off' : '') + (s.demo ? ' demo' : '')}
                disabled={s.disabled}
                onClick={() => setArrivalAt(s.ts)}
                title={s.demo ? 'After-hours test slot' : ''}>
                {fmtTime(s.ts)}{s.demo && <span className="bk-time-tag"> · test</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bk-foot">
        <button className="btn" onClick={onBack}>← Back</button>
        <div style={{ flex: 1 }} />
        <button className="btn primary lg" disabled={!valid} onClick={onNext}>
          Pick your table →
        </button>
      </div>
    </div>
  );
}

// ── Step 2: 3D floor picker ───────────────────────────────────────────────
// CSS-3D perspective tilt of the same coordinate space tables.jsx uses, so
// the customer sees the actual floor layout, not a generic abstraction.
function BookingFloor3D({ tableId, setTableId, partySize, arrivalAt, bookings, onNext, onBack }) {
  const [tilt, setTilt] = React.useState(true);   // 3D vs flat toggle
  const taken = React.useMemo(
    () => unavailableTableIds(bookings, arrivalAt, partySize),
    [bookings, arrivalAt, partySize]
  );

  // Tables that fit the party (must seat at least the party size, but not be huge)
  const fitTable = (t) => t.seats >= partySize && t.seats <= partySize + 4;
  const available = bkTABLES.filter(t => !taken.has(t.id) && fitTable(t));
  const tooSmall = bkTABLES.filter(t => t.seats < partySize);

  const sel = bkTABLES.find(t => t.id === tableId) || null;

  // Auto-pick a sensible default (first available 2–3 seats over party size)
  React.useEffect(() => {
    if (!sel || taken.has(sel.id) || !fitTable(sel)) {
      const best = available.sort((a, b) => Math.abs(a.seats - partySize) - Math.abs(b.seats - partySize))[0];
      setTableId(best ? best.id : null);
    }
  }, [partySize, arrivalAt]);

  return (
    <div className="bk-step">
      <div className="bk-step-head">
        <div className="bk-step-num">2 / 3</div>
        <h2>Pick your seat</h2>
        <div className="bk-step-sub">{partySize} {partySize === 1 ? 'guest' : 'guests'} · {fmtDate(arrivalAt)} · {fmtTime(arrivalAt)}</div>
      </div>

      <div className="bk-floor-bar">
        <div className="bk-floor-legend">
          <span className="bk-l-dot avail" /> Available
          <span className="bk-l-dot taken" /> Reserved
          <span className="bk-l-dot small" /> Too small
          <span className="bk-l-dot pick" /> Your pick
        </div>
        <div style={{ flex: 1 }} />
        <button className={'bk-3d-toggle' + (tilt ? ' on' : '')} onClick={() => setTilt(t => !t)}>
          {tilt ? '⬜ Top-down' : '🎲 3D View'}
        </button>
      </div>

      <div className={'bk-floor3d-wrap' + (tilt ? ' tilted' : '')}>
        <div className="bk-floor3d">
          <div className="bk-floor3d-stage">
            {bkFRAMES.map(s => (
              <React.Fragment key={s.name}>
                <div className="bk-3d-section" style={{ left: s.x, top: s.y, width: s.w, height: s.h }} />
                <div className="bk-3d-section-lbl" style={{ left: s.x + 14, top: s.y - 6 }}>{s.name}</div>
              </React.Fragment>
            ))}
            {bkTABLES.map(t => {
              const isTaken = taken.has(t.id);
              const isSmall = t.seats < partySize;
              const isSel = tableId === t.id;
              const cls = 'bk-3d-tbl'
                + (t.shape === 'round' ? ' round' : '')
                + (isTaken ? ' taken' : isSmall ? ' small' : ' avail')
                + (isSel ? ' pick' : '');
              return (
                <button
                  key={t.id}
                  className={cls}
                  style={{ left: t.x, top: t.y, width: t.w, height: t.h }}
                  disabled={isTaken || isSmall}
                  onClick={() => setTableId(t.id)}
                  title={isTaken ? 'Reserved at this time' : isSmall ? `Seats ${t.seats} — too small for ${partySize}` : `Table ${t.id} · seats ${t.seats}`}
                >
                  <span className="bk-3d-tbl-num">{t.id}</span>
                  <span className="bk-3d-tbl-seats">{t.seats}p</span>
                  {isSel && <span className="bk-3d-tbl-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {sel && (
        <div className="bk-pick-card">
          <div className="bk-pick-icon">{sel.shape === 'round' ? '🔵' : '🟧'}</div>
          <div style={{ flex: 1 }}>
            <div className="bk-pick-name">Table {sel.id} · {sel.section}</div>
            <div className="bk-pick-sub">Seats {sel.seats} · {sel.shape === 'round' ? 'Round' : 'Rectangular'}</div>
          </div>
          <div className="bk-pick-time">{fmtTime(arrivalAt)}</div>
        </div>
      )}
      {!sel && available.length === 0 && (
        <div className="bk-empty">
          <div style={{ fontSize: 28 }}>🪑</div>
          <div>No tables for {partySize} guests at this time. Try a different slot.</div>
        </div>
      )}

      <div className="bk-foot">
        <button className="btn" onClick={onBack}>← Back</button>
        <div style={{ flex: 1 }} />
        <button className="btn primary lg" disabled={!sel} onClick={onNext}>
          Confirm details →
        </button>
      </div>
    </div>
  );
}

// ── Step 3: customer details ──────────────────────────────────────────────
function BookingStep3({ name, setName, phone, setPhone, notes, setNotes, partySize, arrivalAt, tableId, onSubmit, onBack, busy }) {
  const tbl = bkTABLES.find(t => t.id === tableId);
  const valid = name.trim().length >= 2 && phone.trim().length >= 6;
  return (
    <div className="bk-step">
      <div className="bk-step-head">
        <div className="bk-step-num">3 / 3</div>
        <h2>Almost there</h2>
        <div className="bk-step-sub">We'll text you when the restaurant approves your seat.</div>
      </div>

      <div className="bk-summary">
        <div className="bk-summary-row"><span>Party</span><b>{partySize} {partySize === 1 ? 'guest' : 'guests'}</b></div>
        <div className="bk-summary-row"><span>Date</span><b>{fmtDate(arrivalAt)}</b></div>
        <div className="bk-summary-row"><span>Time</span><b>{fmtTime(arrivalAt)}</b></div>
        <div className="bk-summary-row"><span>Table</span><b>{tbl ? `Table ${tbl.id} · ${tbl.section}` : '—'}</b></div>
      </div>

      <div className="bk-section">
        <label className="cu-field">
          <span>Your name *</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aoi Tanaka" />
        </label>
        <label className="cu-field">
          <span>Phone *</span>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9..." />
        </label>
        <label className="cu-field">
          <span>Special requests (optional)</span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anniversary, allergies, high chair…"
            rows="3"
          />
        </label>
      </div>

      <div className="bk-info">
        <span style={{ fontSize: 22 }}>💡</span>
        <div>
          <b>Heads up:</b> the menu unlocks <b>30 minutes before</b> your arrival. That keeps tickets fresh and seats turning. You'll see a live countdown after we approve.
        </div>
      </div>

      <div className="bk-foot">
        <button className="btn" onClick={onBack}>← Back</button>
        <div style={{ flex: 1 }} />
        <button className="btn primary lg" disabled={!valid || busy} onClick={onSubmit}>
          {busy ? 'Submitting…' : 'Request Reservation'}
        </button>
      </div>
    </div>
  );
}

// ── Booking flow controller ───────────────────────────────────────────────
function BookingFlow({ bookings, onSubmit, onBack }) {
  const [step, setStep] = React.useState(1);
  const [partySize, setPartySize] = React.useState(2);
  const [arrivalAt, setArrivalAt] = React.useState(() => {
    // default: today at next half-hour after now+1h
    const t = new Date();
    t.setMinutes(t.getMinutes() + 60, 0, 0);
    t.setMinutes(t.getMinutes() < 30 ? 30 : 0, 0, 0);
    if (t.getMinutes() === 0) t.setHours(t.getHours() + 1);
    if (t.getHours() < OPEN_HOUR) t.setHours(19, 0, 0, 0);
    return t.getTime();
  });
  const [tableId, setTableId] = React.useState(null);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = () => {
    setBusy(true);
    const booking = {
      id: 'B' + Date.now().toString().slice(-7),
      partySize, arrivalAt, durationMin: DEFAULT_DURATION,
      tableId, customerName: name.trim(), customerPhone: phone.trim(),
      notes: notes.trim(),
      status: 'pending',
      confirmationCode: makeCode(),
      createdAt: Date.now(),
      approvedAt: null,
      declineReason: null,
      source: 'customer-app',
    };
    onSubmit(booking);
  };

  return (
    <div className="bk-flow">
      <header className="cu-top">
        <div className="cu-brand akane">
          <div className="cu-logo akane-logo">{'WABI\nSABI'}</div>
          <div>
            <div className="cu-name akane-title">Wabi Sabi</div>
            <div className="cu-sub">Reserve · The Oberoi</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="bk-progress">
          <div className={'bk-pip' + (step >= 1 ? ' on' : '')} />
          <div className={'bk-pip' + (step >= 2 ? ' on' : '')} />
          <div className={'bk-pip' + (step >= 3 ? ' on' : '')} />
        </div>
      </header>

      <div className="bk-body">
        {step === 1 && (
          <BookingStep1
            partySize={partySize} setPartySize={setPartySize}
            arrivalAt={arrivalAt} setArrivalAt={setArrivalAt}
            onNext={() => setStep(2)} onBack={onBack}
          />
        )}
        {step === 2 && (
          <BookingFloor3D
            tableId={tableId} setTableId={setTableId}
            partySize={partySize} arrivalAt={arrivalAt}
            bookings={bookings}
            onNext={() => setStep(3)} onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <BookingStep3
            name={name} setName={setName}
            phone={phone} setPhone={setPhone}
            notes={notes} setNotes={setNotes}
            partySize={partySize} arrivalAt={arrivalAt} tableId={tableId}
            onSubmit={submit} onBack={() => setStep(2)} busy={busy}
          />
        )}
      </div>
    </div>
  );
}

// ── Booking status — shown after submit, owns the 30-min unlock gate ──────
function BookingStatus({ booking, onStartOrdering, onBrowseMenu, onCancel, onSwitchRole, onRebook }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const tbl = bkTABLES.find(t => t.id === booking.tableId);
  const msUntil = booking.arrivalAt - now;
  const msUntilUnlock = msUntil - UNLOCK_BEFORE_MS;
  const status = booking.status;
  const orderingUnlocked = status === 'confirmed' && msUntil <= UNLOCK_BEFORE_MS && msUntil > -90 * 60000;
  const expired = msUntil < -90 * 60000;

  return (
    <div className="bk-status">
      <header className="cu-top">
        <div className="cu-brand akane">
          <div className="cu-logo akane-logo">{'WABI\nSABI'}</div>
          <div>
            <div className="cu-name akane-title">Wabi Sabi</div>
            <div className="cu-sub">Reservation #{booking.confirmationCode}</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn ghost" onClick={onSwitchRole}>⇄ Switch</button>
      </header>

      <div className="bk-status-body">
        <div className={'bk-status-card status-' + status}>
          {status === 'pending' && (
            <>
              <div className="bk-st-pulse"><span /><span /><span /></div>
              <div className="bk-st-head">Waiting for the host</div>
              <div className="bk-st-sub">We sent your request to Wabi Sabi. Most approvals come back in under a minute.</div>
            </>
          )}
          {status === 'declined' && (
            <>
              <div className="bk-st-icon">✕</div>
              <div className="bk-st-head">Reservation declined</div>
              <div className="bk-st-sub">{booking.declineReason || 'The restaurant could not accommodate this slot. Please try a different time or table.'}</div>
              <button className="btn primary lg" style={{ marginTop: 16 }} onClick={onRebook}>Try another time</button>
            </>
          )}
          {status === 'cancelled' && (
            <>
              <div className="bk-st-icon">⊘</div>
              <div className="bk-st-head">Reservation cancelled</div>
              <div className="bk-st-sub">Hope to see you another time.</div>
              <button className="btn primary lg" style={{ marginTop: 16 }} onClick={onRebook}>Book again</button>
            </>
          )}
          {status === 'completed' && (
            <>
              <div className="bk-st-icon">✓</div>
              <div className="bk-st-head">Thank you for dining with us</div>
              <div className="bk-st-sub">Hope to see you back soon.</div>
              <button className="btn primary lg" style={{ marginTop: 16 }} onClick={onRebook}>Book again</button>
            </>
          )}
          {(status === 'confirmed' || status === 'seated') && expired && (
            <>
              <div className="bk-st-icon">⏰</div>
              <div className="bk-st-head">This reservation has passed</div>
              <div className="bk-st-sub">Looking forward to having you back.</div>
              <button className="btn primary lg" style={{ marginTop: 16 }} onClick={onRebook}>Book again</button>
            </>
          )}
          {(status === 'confirmed' || status === 'seated') && !expired && (
            <>
              <div className="bk-st-icon ok">✓</div>
              <div className="bk-st-head">{status === 'seated' ? 'Welcome — you\'re seated' : 'You\'re confirmed!'}</div>
              <div className="bk-st-sub">
                {status === 'seated'
                  ? 'Order whenever you\'re ready.'
                  : (orderingUnlocked
                    ? 'Your menu is open. Tap below to start ordering.'
                    : 'Your menu unlocks 30 minutes before arrival.')}
              </div>

              <div className="bk-countdown">
                <div className="bk-cd-lbl">
                  {orderingUnlocked
                    ? 'Arriving in'
                    : 'Menu unlocks in'}
                </div>
                <div className="bk-cd-val">
                  {orderingUnlocked
                    ? fmtCountdown(Math.max(0, msUntil))
                    : fmtCountdown(Math.max(0, msUntilUnlock))}
                </div>
                {!orderingUnlocked && (
                  <div className="bk-cd-arrival">
                    Arrival · {fmtTime(booking.arrivalAt)}
                  </div>
                )}
              </div>

              <button
                className={'btn lg ' + (orderingUnlocked ? 'primary' : '')}
                style={{ marginTop: 16, width: '100%' }}
                disabled={!orderingUnlocked}
                onClick={onStartOrdering}
              >
                {orderingUnlocked ? '🍣 Start Ordering' : `🔒 Locked until ${fmtTime(booking.arrivalAt - UNLOCK_BEFORE_MS)}`}
              </button>
              {!orderingUnlocked && onBrowseMenu && (
                <button
                  className="btn lg"
                  style={{ marginTop: 8, width: '100%' }}
                  onClick={onBrowseMenu}
                >
                  📖 Browse menu (preview)
                </button>
              )}
            </>
          )}
        </div>

        <div className="bk-recap">
          <h3>Reservation details</h3>
          <div className="bk-recap-row"><span>Confirmation</span><b className="mono">{booking.confirmationCode}</b></div>
          <div className="bk-recap-row"><span>Name</span><b>{booking.customerName}</b></div>
          <div className="bk-recap-row"><span>Phone</span><b>{booking.customerPhone}</b></div>
          <div className="bk-recap-row"><span>Party</span><b>{booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'}</b></div>
          <div className="bk-recap-row"><span>Date</span><b>{fmtDate(booking.arrivalAt)}</b></div>
          <div className="bk-recap-row"><span>Time</span><b>{fmtTime(booking.arrivalAt)}</b></div>
          <div className="bk-recap-row"><span>Table</span><b>{tbl ? `${tbl.id} · ${tbl.section}` : '—'}</b></div>
          {booking.notes && (
            <div className="bk-recap-note">"{booking.notes}"</div>
          )}
          {(status === 'pending' || status === 'confirmed') && !expired && (
            <button className="btn" style={{ marginTop: 12 }} onClick={() => {
              if (confirm('Cancel this reservation?')) onCancel();
            }}>Cancel reservation</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Lookup screen — return with confirmation code ─────────────────────────
function BookingLookup({ bookings, onFound, onBack }) {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');

  const tryLookup = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) { setError('Enter your 6-character code'); return; }
    const found = bookings.find(b => b.confirmationCode === c);
    if (!found) { setError('No reservation matches that code'); return; }
    onFound(found.id);
  };

  return (
    <div className="role-screen akane">
      <div className="role-card akane bk-lookup">
        <div className="role-logo akane-logo">{'WABI\nSABI'}</div>
        <h1 className="akane-title">Find your reservation</h1>
        <div className="role-tag">Enter the 6-character code we gave you.</div>
        <div className="bk-lookup-form">
          <input
            className="bk-lookup-input mono"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') tryLookup(); }}
            placeholder="ABC123"
            maxLength="6"
          />
          {error && <div className="bk-lookup-err">{error}</div>}
          <button className="btn primary lg" onClick={tryLookup}>Look up</button>
          <button className="btn" onClick={onBack}>← Back</button>
        </div>
      </div>
    </div>
  );
}

// ── Staff: Reservations approval queue ────────────────────────────────────
function ReservationsScreen({ bookings, onApprove, onDecline, onSeat, onComplete, onCancel }) {
  const [tab, setTab] = React.useState('pending');
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const [declineFor, setDeclineFor] = React.useState(null);
  const [declineReason, setDeclineReason] = React.useState('');

  const buckets = React.useMemo(() => {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);
    const out = { pending: [], today: [], upcoming: [], past: [] };
    [...bookings].sort((a, b) => a.arrivalAt - b.arrivalAt).forEach(b => {
      if (b.status === 'pending') out.pending.push(b);
      else if (b.status === 'declined' || b.status === 'cancelled' || b.status === 'completed') out.past.push(b);
      else if (b.arrivalAt >= dayStart.getTime() && b.arrivalAt < dayEnd.getTime()) out.today.push(b);
      else if (b.arrivalAt >= dayEnd.getTime()) out.upcoming.push(b);
      else out.past.push(b);
    });
    out.past.reverse();
    return out;
  }, [bookings]);

  const list = buckets[tab] || [];

  const conflictWith = (booking) => {
    return bookings.filter(b => b.id !== booking.id
      && b.status !== 'declined' && b.status !== 'cancelled' && b.status !== 'completed'
      && bookingsConflict(b, booking));
  };

  const renderCard = (b) => {
    const tbl = bkTABLES.find(t => t.id === b.tableId);
    const conflicts = b.status === 'pending' ? conflictWith(b) : [];
    const msUntil = b.arrivalAt - now;
    const arriving = b.status === 'confirmed' && msUntil <= 30 * 60000 && msUntil > -10 * 60000;
    return (
      <div key={b.id} className={'bk-card status-' + b.status + (arriving ? ' arriving' : '')}>
        <div className="bk-card-head">
          <div className="bk-card-time">
            <div className="bk-card-t">{fmtTime(b.arrivalAt)}</div>
            <div className="bk-card-d">{fmtDate(b.arrivalAt)}</div>
          </div>
          <div className="bk-card-mid">
            <div className="bk-card-name">
              {b.customerName}
              <span className="bk-card-party">· {b.partySize}p</span>
            </div>
            <div className="bk-card-meta">
              📍 {tbl ? `Table ${tbl.id} · ${tbl.section}` : 'No table'}
              · 📞 {b.customerPhone}
            </div>
            {b.notes && <div className="bk-card-note">"{b.notes}"</div>}
            <div className="bk-card-code mono">#{b.confirmationCode}</div>
          </div>
          <div className="bk-card-status">
            <span className={'bk-pill status-' + b.status}>{b.status}</span>
            {arriving && <span className="bk-pill arriving">⏰ arriving</span>}
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="bk-card-conflict">
            ⚠ Overlaps with #{conflicts.map(c => c.confirmationCode).join(', ')} on the same table.
          </div>
        )}
        {b.declineReason && b.status === 'declined' && (
          <div className="bk-card-conflict">Declined: {b.declineReason}</div>
        )}

        <div className="bk-card-actions">
          {b.status === 'pending' && (
            <>
              <button className="btn primary" onClick={() => onApprove(b.id)}>✓ Approve</button>
              <button className="btn" onClick={() => { setDeclineFor(b.id); setDeclineReason(''); }}>✕ Decline</button>
            </>
          )}
          {b.status === 'confirmed' && (
            <>
              <button className="btn primary" onClick={() => onSeat(b.id)}>🪑 Mark Seated</button>
              <button className="btn" onClick={() => onCancel(b.id)}>Cancel</button>
            </>
          )}
          {b.status === 'seated' && (
            <button className="btn primary" onClick={() => onComplete(b.id)}>✓ Complete</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bk-staff">
      <div className="bk-staff-tabs">
        <button className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>
          Pending {buckets.pending.length > 0 && <span className="bk-staff-badge">{buckets.pending.length}</span>}
        </button>
        <button className={tab === 'today' ? 'on' : ''} onClick={() => setTab('today')}>
          Today {buckets.today.length > 0 && <span className="bk-staff-cnt">{buckets.today.length}</span>}
        </button>
        <button className={tab === 'upcoming' ? 'on' : ''} onClick={() => setTab('upcoming')}>
          Upcoming {buckets.upcoming.length > 0 && <span className="bk-staff-cnt">{buckets.upcoming.length}</span>}
        </button>
        <button className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>
          Past
        </button>
      </div>

      <div className="bk-staff-list">
        {list.length === 0 && (
          <div className="empty-state" style={{ padding: 60 }}>
            <div style={{ fontSize: 36 }}>📭</div>
            <div style={{ fontWeight: 600, color: 'var(--ink-2)' }}>No reservations here</div>
            <div style={{ fontSize: 12 }}>{tab === 'pending' ? 'New requests will appear instantly.' : 'Check the other tabs.'}</div>
          </div>
        )}
        {list.map(renderCard)}
      </div>

      {declineFor && (
        <div className="modal-veil" onClick={() => setDeclineFor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 460 }}>
            <div className="modal-head"><h3>Decline reservation</h3></div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>The customer will see this reason. Keep it polite.</div>
              <textarea
                className="notes" rows="3" style={{ width: '100%' }}
                placeholder="Sorry — we're fully booked at this time. Could we offer 8:30 PM instead?"
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                autoFocus
              />
              <div className="bk-decline-quick">
                {['Fully booked at that time', 'Kitchen closed for private event', 'Party size cannot be accommodated'].map(r => (
                  <button key={r} className="btn ghost" onClick={() => setDeclineReason(r)}>{r}</button>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setDeclineFor(null)}>Back</button>
              <div style={{ flex: 1 }} />
              <button className="btn primary" onClick={() => {
                onDecline(declineFor, declineReason.trim() || 'No reason given.');
                setDeclineFor(null);
              }}>Send decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.CustomerWelcome = CustomerWelcome;
window.BookingFlow = BookingFlow;
window.BookingStatus = BookingStatus;
window.BookingLookup = BookingLookup;
window.ReservationsScreen = ReservationsScreen;

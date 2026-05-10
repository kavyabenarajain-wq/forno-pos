// Main app shell — command palette, manager mode, 86 list, receipts, persistence
const { CATEGORIES: CC, TABLES: TT, SEED_HISTORY: SH, MENU: aMENU, fmt: aFmt, TAX_RATE: aTax, uid: aUid } = window.POS_DATA;

const TWEAK_DEFAULTS = {
  theme: 'light',
  density: 'comfortable',
  accentHue: 45,
  showPrices: true,
  kitchenAlerts: true,
  showShortcuts: true,
};

const LS_KEY = 'akane-pos-v1';
const loadLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; } };
const saveLS = (d) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} };

function SplashScreen() {
  const [msg, setMsg] = React.useState('Initializing');
  React.useEffect(() => {
    const steps = [
      [200, 'Connecting to kitchen display'],
      [600, 'Loading menu · 32 items'],
      [1100, 'Syncing tables · 24 zones'],
      [1600, 'Authorizing payment terminal'],
      [2100, 'Welcome'],
    ];
    const ts = steps.map(([t, m]) => setTimeout(() => setMsg(m), t));
    return () => ts.forEach(clearTimeout);
  }, []);
  const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="splash akane">
      <div className="splash-inner">
        <div className="splash-logo akane-logo">The Oberoi · Bangalore</div>
        <h1 className="splash-title akane-title">Wabi Sabi</h1>
        <div className="splash-tag akane-tag">Point of Sale · v5.0</div>
        <div className="splash-bar" />
        <div className="splash-status">{msg}</div>
      </div>
      <div className="splash-meta">Station 02 · Front of House · <b>{today}</b></div>
    </div>
  );
}

// ── Demo data seeder ─────────────────────────────────────────────────────
// Generates realistic-looking history (~12 closed orders distributed across
// today's hours), 2 open orders, and 1 KDS ticket. Idempotent — call only
// when storage is empty (or via a manual "reset to demo" button).
const SEED_DEMO_KEY = 'akane-pos-seeded-v1';
function generateDemoData() {
  const D = window.POS_DATA;
  const menu = D.MENU;
  const STAFF = D.STAFF;
  const TABLES = D.TABLES;
  const TAX = D.TAX_RATE;
  const popular = menu.filter(m => m.popular);
  const pickItem = () => Math.random() < 0.6 ? popular[Math.floor(Math.random() * popular.length)] : menu[Math.floor(Math.random() * menu.length)];
  const pickStaff = () => STAFF[Math.floor(Math.random() * STAFF.length)];
  const pickTable = () => TABLES[Math.floor(Math.random() * TABLES.length)];

  // Distribute across hours up to 30 min ago
  const now = new Date();
  const cutoff = new Date(now); cutoff.setMinutes(now.getMinutes() - 30);
  const startHour = 12;
  const hoursLeft = Math.max(0, cutoff.getHours() - startHour);
  const totalOrders = Math.max(8, Math.min(18, hoursLeft * 2 + 6));

  const history = [];
  const usedIds = new Set();
  for (let i = 0; i < totalOrders; i++) {
    // pick a time before cutoff
    const hourOffset = Math.floor(Math.random() * Math.max(1, hoursLeft + 1));
    const minute = Math.floor(Math.random() * 60);
    const t = new Date(now);
    t.setHours(startHour + hourOffset, minute, 0, 0);
    if (t > cutoff) continue;

    const lineCount = 2 + Math.floor(Math.random() * 4);
    const lines = [];
    for (let j = 0; j < lineCount; j++) {
      const it = pickItem();
      const qty = 1 + (Math.random() < 0.25 ? 1 : 0);
      lines.push({ name: it.name, qty, unit: it.price, lineId: D.uid() });
    }
    const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const total = subtotal * (1 + TAX);
    const staff = pickStaff();
    const table = pickTable();
    const methods = ['UPI', 'CARD', 'CASH', 'WALLET', 'UPI', 'UPI', 'CARD'];
    const method = methods[Math.floor(Math.random() * methods.length)];
    let id; do { id = '10' + (43 + i + Math.floor(Math.random() * 100)).toString(); } while (usedIds.has(id));
    usedIds.add(id);
    history.push({
      id, table: typeof table.id === 'string' ? table.id : 'Table ' + table.id,
      server: staff.name,
      items: lines.reduce((s, l) => s + l.qty, 0),
      total, status: 'paid', method,
      time: t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      guests: 1 + Math.floor(Math.random() * Math.min(4, table.seats - 1)),
      lineSnapshot: lines,
      paidAt: t.getTime(),
    });
  }
  history.sort((a, b) => b.paidAt - a.paidAt);

  // 2 open orders
  const openOrders = [];
  for (let i = 0; i < 2; i++) {
    const table = pickTable();
    const staff = pickStaff();
    const lineCount = 2 + Math.floor(Math.random() * 3);
    const lines = [];
    for (let j = 0; j < lineCount; j++) {
      const it = pickItem();
      lines.push({
        lineId: D.uid(), itemId: it.id, name: it.name, cat: it.cat,
        basePrice: it.price, mods: [], notes: '',
        qty: 1 + Math.floor(Math.random() * 2),
        unit: it.price, sent: i === 0, seat: 0,
        course: it.cat === 'starters' ? 'starter' : it.cat === 'desserts' ? 'dessert' : 'main',
      });
    }
    openOrders.push({
      id: '10' + (200 + i),
      tableId: table.id,
      tableLabel: typeof table.id === 'string' ? table.id : 'Table ' + table.id,
      guests: 2, server: staff.name,
      lines, discount: 0, note: '', openedAt: Date.now() - 1000 * 60 * (5 + i * 10),
    });
  }

  // 1 active kitchen ticket from the first open order
  const firstOrder = openOrders[0];
  const kdsTickets = firstOrder ? [{
    id: 'K' + D.uid(), orderId: firstOrder.id, tableLabel: firstOrder.tableLabel,
    server: firstOrder.server, guests: firstOrder.guests,
    firedAt: Date.now() - 1000 * 60 * 4,
    items: firstOrder.lines.map(l => ({ qty: l.qty, name: l.name, mods: l.mods, notes: l.notes })),
  }] : [];

  // Table state: a few seated/ordered/check
  const tableState = {};
  openOrders.forEach((o, i) => { tableState[o.tableId] = { status: i === 0 ? 'ordered' : 'seated', seatedAt: o.openedAt, server: o.server }; });
  // Add a few extra seated and dirty tables
  const extras = TABLES.filter(t => !tableState[t.id]).slice(0, 4);
  if (extras[0]) tableState[extras[0].id] = { status: 'check', seatedAt: Date.now() - 1000 * 60 * 35 };
  if (extras[1]) tableState[extras[1].id] = { status: 'seated', seatedAt: Date.now() - 1000 * 60 * 8 };
  if (extras[2]) tableState[extras[2].id] = { status: 'dirty' };

  return { history, openOrders, kdsTickets, tableState, eightySixed: [], inventory: {}, invActivity: [] };
}

const ROLE_LS = 'forno-pos-role';
const CUSTOMER_ORDER_LS = 'forno-pos-customer-active-order';
const CUSTOMER_BOOKING_LS = 'forno-pos-customer-active-booking';
const loadCustomerOrder = () => { try { return JSON.parse(sessionStorage.getItem(CUSTOMER_ORDER_LS) || 'null'); } catch { return null; } };
const saveCustomerOrder = (o) => { try { o ? sessionStorage.setItem(CUSTOMER_ORDER_LS, JSON.stringify(o)) : sessionStorage.removeItem(CUSTOMER_ORDER_LS); } catch {} };
const loadCustomerBooking = () => { try { return localStorage.getItem(CUSTOMER_BOOKING_LS) || null; } catch { return null; } };
const saveCustomerBooking = (id) => { try { id ? localStorage.setItem(CUSTOMER_BOOKING_LS, id) : localStorage.removeItem(CUSTOMER_BOOKING_LS); } catch {} };

function App() {
  // First-run demo seed: if storage is empty AND we've never seeded, populate
  // realistic mock data so the forecast / inventory / reports show signal.
  const persistedRaw = loadLS();
  const everSeeded = (() => { try { return localStorage.getItem(SEED_DEMO_KEY) === '1'; } catch { return false; } })();
  const isEmpty = !persistedRaw.history || persistedRaw.history.length === 0;
  if (isEmpty && !everSeeded) {
    const seed = generateDemoData();
    Object.assign(persistedRaw, seed);
    saveLS(persistedRaw);
    try { localStorage.setItem(SEED_DEMO_KEY, '1'); } catch {}
  }
  const persisted = React.useRef(persistedRaw);
  const [splash, setSplash] = React.useState(true);
  React.useEffect(() => { const t = setTimeout(() => setSplash(false), 2900); return () => clearTimeout(t); }, []);

  const [role, setRole] = React.useState(() => { try { return sessionStorage.getItem(ROLE_LS); } catch { return null; } });
  const setRolePersist = (r) => {
    setRole(r);
    try { r ? sessionStorage.setItem(ROLE_LS, r) : sessionStorage.removeItem(ROLE_LS); } catch {}
  };

  const [customerOrderId, setCustomerOrderId] = React.useState(() => {
    const o = loadCustomerOrder();
    return o ? o.id : null;
  });
  const [customerBookingId, setCustomerBookingId] = React.useState(() => loadCustomerBooking());
  const [customerView, setCustomerView] = React.useState('welcome'); // welcome | book | lookup | order | status | browse
  const [bookingToast, setBookingToast] = React.useState(null);

  const [user, setUser] = React.useState(null);
  const [view, setView] = React.useState('tables');
  const [openOrders, setOpenOrders] = React.useState(persisted.current.openOrders || []);
  const [activeOrderId, setActiveOrderId] = React.useState(null);
  const [tableState, setTableState] = React.useState(persisted.current.tableState || {});
  const [kdsTickets, setKdsTickets] = React.useState(persisted.current.kdsTickets || []);
  const [history, setHistory] = React.useState(persisted.current.history || []);
  const [eightySixed, setEightySixed] = React.useState(persisted.current.eightySixed || []);
  const [inventory, setInventory] = React.useState(persisted.current.inventory || {});
  const [invActivity, setInvActivity] = React.useState(persisted.current.invActivity || []);
  const [bookings, setBookings] = React.useState(persisted.current.bookings || []);
  const [paying, setPaying] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [showSwitch, setShowSwitch] = React.useState(false);
  const [showCmd, setShowCmd] = React.useState(false);
  const [show86, setShow86] = React.useState(false);
  const [showMgr, setShowMgr] = React.useState(null); // {title, sub, action}
  const [receipt, setReceipt] = React.useState(null);
  const [modalItem, setModalItem] = React.useState(null); // {item, addCb}
  const [showImgMgr, setShowImgMgr] = React.useState(false);
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);

  // Persist
  React.useEffect(() => {
    saveLS({ openOrders, tableState, kdsTickets, history, eightySixed, inventory, invActivity, bookings });
  }, [openOrders, tableState, kdsTickets, history, eightySixed, inventory, invActivity, bookings]);

  // Inventory: deduct ingredients for the lines in this order, log activity.
  // Uses functional setInventory so two orders fired in the same React tick
  // can't read stale inventory state. Logs a full per-order breakdown
  // (line items + each ingredient + qty + unit + remaining stock) so the
  // staff can audit "what did this order actually consume" after the fact.
  const consumeForOrder = React.useCallback((order, lines) => {
    const RECIPES = window.POS_DATA.RECIPES;
    const BASE = window.POS_DATA.INVENTORY_BASELINE;
    const consumed = {};       // ingredient -> qty
    const skipped = [];        // dishes with no recipe (shouldn't happen)
    let remainingSnapshot = null;

    setInventory(prev => {
      const cur = { ...prev };
      lines.forEach(l => {
        const recipe = RECIPES[l.itemId];
        if (!recipe) { skipped.push(l.name); return; }
        Object.entries(recipe).forEach(([ing, qtyPerUnit]) => {
          if (!BASE[ing]) return;
          const used = qtyPerUnit * l.qty;
          const prevStock = cur[ing] != null ? cur[ing] : BASE[ing].stock;
          cur[ing] = Math.max(0, prevStock - used);
          consumed[ing] = (consumed[ing] || 0) + used;
        });
      });
      remainingSnapshot = { ...cur };
      return cur;
    });

    if (Object.keys(consumed).length === 0 && skipped.length === 0) return;

    const itemSummary = lines.map(l => `${l.qty}× ${l.name}`).join(' · ');
    const consumedDetail = Object.entries(consumed).map(([ing, qty]) => ({
      ing, qty, unit: BASE[ing].unit,
      remaining: remainingSnapshot ? remainingSnapshot[ing] : null,
      par: BASE[ing].par,
    })).sort((a, b) => b.qty - a.qty);

    setInvActivity(act => [{
      t: Date.now(),
      kind: 'consume',
      orderId: order.id,
      tableLabel: order.tableLabel,
      source: order.source || 'staff',
      itemSummary,
      lineSnapshot: lines.map(l => ({ name: l.name, qty: l.qty })),
      consumed: consumedDetail,
      skipped,
      // text kept for back-compat with the old renderer
      text: `Order #${order.id} · ${itemSummary}`,
    }, ...act].slice(0, 80));

    if (skipped.length > 0) {
      console.warn('Inventory: dishes without recipes were skipped:', skipped);
    }
  }, []);

  // Cross-tab sync: when another tab (customer in one tab, staff in another)
  // updates the shared store, reload our local state from storage.
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== LS_KEY || !e.newValue) return;
      try {
        const d = JSON.parse(e.newValue);
        if (d.openOrders) setOpenOrders(d.openOrders);
        if (d.tableState) setTableState(d.tableState);
        if (d.kdsTickets) setKdsTickets(d.kdsTickets);
        if (d.history) setHistory(d.history);
        if (d.eightySixed) setEightySixed(d.eightySixed);
        if (d.bookings) setBookings(d.bookings);
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Theme — accent tokens are owned by the Wabi Sabi palette in styles.css.
  // The legacy accentHue slider was hardcoding pure orange via JS on every
  // render, which stomped the bronze tokens. Don't override the accent here.
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
  }, [tweaks.theme]);

  const showToast = (msg, kind) => { setToast({ msg, kind }); setTimeout(() => setToast(null), 2400); };

  const activeOrder = openOrders.find(o => o.id === activeOrderId);
  const setActiveOrder = (updater) => {
    setOpenOrders(orders => orders.map(o => o.id === activeOrderId ? (typeof updater === 'function' ? updater(o) : updater) : o));
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!user || splash) return;
    let lastG = 0;
    const onKey = (e) => {
      if (e.target.matches('input,textarea')) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCmd(true); return; }
      if (e.key === 'Escape') { setShowCmd(false); setShow86(false); setShowMgr(null); setReceipt(null); }
      if (e.key === '?') { setShowCmd(true); }
      // g + key sequence
      if (e.key === 'g') { lastG = Date.now(); return; }
      if (Date.now() - lastG < 800) {
        if (e.key === 't') setView('tables');
        if (e.key === 'o') setView('order');
        if (e.key === 'k') setView('kds');
        if (e.key === 'h') setView('history');
        if (e.key === 'r') setView('reports');
        lastG = 0;
      }
      if (e.key === 'n' && !showCmd) startWalkIn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, splash, showCmd]);

  const nextOrderId = () => '10' + (43 + openOrders.length + history.length).toString();

  const startOrderForTable = (table) => {
    let existing = openOrders.find(o => o.tableId === table.id);
    if (!existing) {
      const newOrder = {
        id: nextOrderId(), tableId: table.id,
        tableLabel: typeof table.id === 'string' ? table.id : 'Table ' + table.id,
        guests: Math.min(table.seats, 2), server: user?.name,
        lines: [], discount: 0, note: '', openedAt: Date.now(),
      };
      setOpenOrders(o => [...o, newOrder]);
      setActiveOrderId(newOrder.id);
      setTableState(s => ({ ...s, [table.id]: { ...(s[table.id] || {}), status: 'seated', seatedAt: s[table.id]?.seatedAt || Date.now(), server: user?.name } }));
    } else {
      setActiveOrderId(existing.id);
    }
    setView('order');
  };

  const startWalkIn = () => {
    const newOrder = {
      id: nextOrderId(), tableId: 'walkin-' + aUid(), tableLabel: 'Walk-In / Counter',
      guests: 1, server: user?.name, lines: [], discount: 0, note: '', openedAt: Date.now(),
    };
    setOpenOrders(o => [...o, newOrder]);
    setActiveOrderId(newOrder.id);
    setView('order');
  };

  const sendToKitchen = (order) => {
    const unsentLines = order.lines.filter(l => !l.sent);
    if (unsentLines.length === 0) { showToast('Re-fired ticket 🔥', 'ok'); return; }
    const ticket = {
      id: 'K' + aUid(), orderId: order.id, tableLabel: order.tableLabel,
      server: order.server || user?.name, guests: order.guests,
      firedAt: Date.now(),
      items: unsentLines.map(l => ({ qty: l.qty, name: l.name, mods: l.mods, notes: l.notes })),
    };
    setKdsTickets(t => [ticket, ...t]);
    setOpenOrders(orders => orders.map(o => o.id === order.id ? { ...o, lines: o.lines.map(l => ({ ...l, sent: true })) } : o));
    if (typeof order.tableId === 'number' || (typeof order.tableId === 'string' && order.tableId.length <= 3)) {
      setTableState(s => ({ ...s, [order.tableId]: { ...(s[order.tableId] || {}), status: 'ordered' } }));
    }
    consumeForOrder(order, unsentLines);
    showToast('Sent to kitchen · ' + unsentLines.length + ' item' + (unsentLines.length === 1 ? '' : 's'), 'ok');
  };

  const completePayment = (paidOrder) => {
    setHistory(h => [{
      id: paidOrder.id, table: paidOrder.tableLabel, server: paidOrder.server || user?.name,
      items: paidOrder.lines.reduce((s, l) => s + l.qty, 0), total: paidOrder.total,
      status: 'paid',
      method: paidOrder.splits.length > 1 ? 'Split' : (paidOrder.splits[0]?.method?.toUpperCase()) || 'UPI',
      time: new Date(paidOrder.paidAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      guests: paidOrder.guests,
      lineSnapshot: paidOrder.lines.map(l => ({ name: l.name, qty: l.qty, unit: l.unit })),
    }, ...h]);
    setOpenOrders(o => o.filter(x => x.id !== paidOrder.id));
    if (paidOrder.tableId !== undefined) {
      setTableState(s => ({ ...s, [paidOrder.tableId]: { ...(s[paidOrder.tableId] || {}), status: 'dirty' } }));
    }
    setPaying(null);
    setActiveOrderId(null);
    setReceipt(paidOrder);
    setView('tables');
    showToast('Payment complete · ' + aFmt(paidOrder.total), 'ok');
  };

  const handleCommand = (c) => {
    setShowCmd(false);
    if (c.id === 'go-tables') setView('tables');
    else if (c.id === 'go-order') setView('order');
    else if (c.id === 'go-kds') setView('kds');
    else if (c.id === 'go-history') setView('history');
    else if (c.id === 'go-reports') setView('reports');
    else if (c.id === 'walkin') startWalkIn();
    else if (c.id === '86') setShow86(true);
    else if (c.id === 'mgr') setShowMgr({ title: 'Manager Override', sub: 'Comp items, void orders, refunds…', action: () => showToast('Manager mode active for 5 min', 'ok') });
    else if (c.id === 'lock') setUser(null);
    else if (c.id === 'reset') { setOpenOrders([]); setKdsTickets([]); setTableState({}); setHistory([]); setEightySixed([]); localStorage.removeItem(LS_KEY); showToast('All data cleared'); }
    else if (c.item) {
      if (!activeOrder) { startWalkIn(); setTimeout(() => addItemDirect(c.item), 50); }
      else addItemDirect(c.item);
      setView('order');
    }
  };

  const addItemDirect = (item) => {
    const groups = window.POS_DATA.MOD_GROUPS[item.cat];
    if (groups && groups.length) {
      setModalItem({ item, addCb: (mods, notes, qty) => addLineToActive(item, mods, notes, qty) });
    } else {
      addLineToActive(item, [], '', 1);
    }
  };
  const addLineToActive = (item, mods, notes, qty) => {
    const addPrice = mods.reduce((s, m) => s + (m.addPrice || 0), 0);
    const courseGuess = item.cat === 'starters' ? 'starter' : item.cat === 'desserts' ? 'dessert' : (item.cat === 'drinks' || item.cat === 'bar') ? 'drink' : 'main';
    const line = { lineId: aUid(), itemId: item.id, name: item.name, cat: item.cat, basePrice: item.price, mods, notes, qty, unit: item.price + addPrice, sent: false, seat: 0, course: courseGuess };
    setActiveOrder(o => ({ ...o, lines: [...o.lines, line] }));
    setModalItem(null);
  };

  // ── Bookings ──────────────────────────────────────────────────────────
  // Customer submits a reservation request. Staff sees it as pending in
  // Reservations and approves / declines. State is shared via the same
  // localStorage blob, so both tabs (customer + staff) stay in sync.
  const submitBooking = (booking) => {
    setBookings(b => [booking, ...b]);
    setCustomerBookingId(booking.id);
    saveCustomerBooking(booking.id);
    showToast('Reservation requested · waiting for the host', 'ok');
  };

  const updateBooking = (id, patch) => {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const approveBooking = (id) => {
    updateBooking(id, { status: 'confirmed', approvedAt: Date.now() });
    showToast('Reservation approved', 'ok');
  };
  const declineBooking = (id, reason) => {
    updateBooking(id, { status: 'declined', declineReason: reason || 'Unable to accommodate.' });
    showToast('Reservation declined', 'warn');
  };
  const cancelBooking = (id) => {
    updateBooking(id, { status: 'cancelled' });
    showToast('Reservation cancelled', 'warn');
  };
  const seatBooking = (id) => {
    const b = bookings.find(x => x.id === id);
    updateBooking(id, { status: 'seated' });
    if (b && b.tableId) {
      setTableState(s => ({ ...s, [b.tableId]: { ...(s[b.tableId] || {}), status: 'seated', seatedAt: Date.now() } }));
    }
    showToast('Guests seated', 'ok');
  };
  const completeBooking = (id) => {
    updateBooking(id, { status: 'completed' });
    showToast('Reservation closed', 'ok');
  };

  // Customer-side: submit a new order and auto-fire it to the kitchen so staff
  // see it immediately. Order keeps source: 'customer' so staff can badge it.
  const submitCustomerOrder = (order) => {
    const subtotal = order.lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const tax = subtotal * aTax;
    const total = subtotal + tax;
    const orderWithTotals = { ...order, total, firedAt: Date.now() };
    setOpenOrders(o => [...o, orderWithTotals]);
    // Auto-fire to KDS
    const ticket = {
      id: 'K' + aUid(), orderId: order.id, tableLabel: order.tableLabel,
      server: order.server || order.customerName || 'Customer App',
      guests: order.guests || 1, firedAt: Date.now(),
      items: order.lines.map(l => ({ qty: l.qty, name: l.name, mods: l.mods, notes: l.notes })),
      source: 'customer',
    };
    setKdsTickets(t => [ticket, ...t]);
    setOpenOrders(orders => orders.map(o => o.id === order.id ? { ...o, lines: o.lines.map(l => ({ ...l, sent: true })) } : o));
    consumeForOrder(order, order.lines);
    setCustomerOrderId(order.id);
    saveCustomerOrder({ id: order.id });
  };

  // Derive the customer's current order from the shared state so it stays
  // live as staff bump the kitchen ticket / mark paid.
  const myCustomerOrder = React.useMemo(() => {
    if (!customerOrderId) return null;
    const open = openOrders.find(o => o.id === customerOrderId);
    const histRow = history.find(h => h.id === customerOrderId);
    if (open) {
      const ticket = kdsTickets.find(t => t.orderId === open.id);
      let derived = 'placed';
      if (ticket) derived = 'kitchen';
      else if (open.lines.length) derived = 'ready'; // fired then bumped
      return { ...open, _derivedStatus: derived, firedAt: ticket?.firedAt || open.firedAt || open.openedAt };
    }
    if (histRow) {
      // We need lines for the bill; use snapshot if available
      return {
        id: histRow.id,
        tableLabel: histRow.table,
        customerName: histRow.server,
        lines: (histRow.lineSnapshot || []).map(s => ({ ...s, lineId: s.name, mods: [], notes: '' })),
        total: histRow.total,
        diningMode: 'dinein',
        _derivedStatus: 'paid',
        firedAt: Date.now(),
      };
    }
    return null;
  }, [customerOrderId, openOrders, kdsTickets, history]);

  // Auto-clear customer's "active order" after they see it paid for ~10s
  React.useEffect(() => {
    if (myCustomerOrder?._derivedStatus === 'paid') {
      const t = setTimeout(() => { setCustomerOrderId(null); saveCustomerOrder(null); }, 10000);
      return () => clearTimeout(t);
    }
  }, [myCustomerOrder?._derivedStatus]);

  // Staff notification: announce new pending bookings as they arrive.
  const seenPendingRef = React.useRef(null);
  React.useEffect(() => {
    if (role !== 'staff' || !user) return;
    const pending = bookings.filter(b => b.status === 'pending');
    const ids = pending.map(b => b.id).sort().join(',');
    if (seenPendingRef.current === null) { seenPendingRef.current = ids; return; }
    if (ids !== seenPendingRef.current) {
      const newOnes = pending.filter(b => !seenPendingRef.current.includes(b.id));
      if (newOnes.length > 0) {
        const b = newOnes[0];
        showToast(`📅 New reservation · ${b.customerName} · ${b.partySize}p · ${new Date(b.arrivalAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'ok');
      }
      seenPendingRef.current = ids;
    }
  }, [bookings, role, user]);

  if (splash) return <SplashScreen />;

  // Role select gate
  if (!role) return <RoleSelect onPick={setRolePersist} />;

  // Customer flow — booking gate, then ordering
  if (role === 'customer') {
    const myBooking = customerBookingId ? bookings.find(b => b.id === customerBookingId) : null;
    const switchRole = () => {
      setRolePersist(null);
      setCustomerOrderId(null);
      saveCustomerOrder(null);
      setCustomerBookingId(null);
      saveCustomerBooking(null);
      setCustomerView('welcome');
    };

    // While the customer has an active order in flight, always show the order tracker.
    if (myCustomerOrder) {
      return (
        <CustomerApp
          onBackToRole={() => setRolePersist(null)}
          onSwitchRole={switchRole}
          onSubmitOrder={submitCustomerOrder}
          myOrder={myCustomerOrder}
        />
      );
    }

    // Has an active booking → show its status. Browsing the menu is allowed
    // anytime once the booking is confirmed/seated, but order placement is
    // gated until 30 min before arrival (CustomerApp enforces orderingLocked).
    if (myBooking && customerView !== 'order' && customerView !== 'browse') {
      return (
        <BookingStatus
          booking={myBooking}
          onStartOrdering={() => setCustomerView('order')}
          onBrowseMenu={() => setCustomerView('browse')}
          onCancel={() => { cancelBooking(myBooking.id); }}
          onSwitchRole={switchRole}
          onRebook={() => { setCustomerBookingId(null); saveCustomerBooking(null); setCustomerView('book'); }}
        />
      );
    }

    // Order view: pre-fill table from approved booking if present.
    // 'browse' forces preview-only mode (no cart, no order placement) — used
    // for guests without a booking, or guests waiting for their unlock window.
    if (customerView === 'order' || customerView === 'walkin' || customerView === 'browse') {
      const UNLOCK_MS = (window.BOOKING_UTILS && window.BOOKING_UTILS.UNLOCK_BEFORE_MS) || 30 * 60 * 1000;
      const bookingPrefill = myBooking && (myBooking.status === 'confirmed' || myBooking.status === 'seated')
        ? { tableNo: String(myBooking.tableId), customerName: myBooking.customerName, bookingId: myBooking.id, partySize: myBooking.partySize }
        : null;
      // Browse mode: confirmed booking but not yet within the 30-min window,
      // OR explicit 'browse' view (preview without ability to order).
      // Walk-ins (no booking) are always unlocked.
      const timeLocked = !!myBooking
        && (myBooking.status === 'confirmed' || myBooking.status === 'seated')
        && (myBooking.arrivalAt - Date.now()) > UNLOCK_MS;
      const orderingLocked = customerView === 'browse' || timeLocked;
      const unlockAt = (timeLocked && myBooking) ? (myBooking.arrivalAt - UNLOCK_MS) : null;
      return (
        <CustomerApp
          onBackToRole={() => setRolePersist(null)}
          onSwitchRole={switchRole}
          onSubmitOrder={(order) => {
            const enriched = bookingPrefill ? {
              ...order,
              bookingId: bookingPrefill.bookingId,
              tableId: myBooking.tableId,
              tableLabel: 'Table ' + myBooking.tableId + ' · Reserved',
              guests: bookingPrefill.partySize,
              customerName: bookingPrefill.customerName,
              tableNo: String(myBooking.tableId),
              diningMode: 'dinein',
            } : order;
            submitCustomerOrder(enriched);
            if (bookingPrefill) seatBooking(bookingPrefill.bookingId);
          }}
          myOrder={null}
          prefill={bookingPrefill}
          orderingLocked={orderingLocked}
          unlockAt={unlockAt}
          onBackToBooking={(myBooking || customerView === 'browse') ? () => setCustomerView('welcome') : null}
        />
      );
    }

    if (customerView === 'lookup') {
      return (
        <BookingLookup
          bookings={bookings}
          onFound={(id) => { setCustomerBookingId(id); saveCustomerBooking(id); setCustomerView('welcome'); }}
          onBack={() => setCustomerView('welcome')}
        />
      );
    }

    if (customerView === 'book') {
      return (
        <BookingFlow
          bookings={bookings}
          onSubmit={(booking) => { submitBooking(booking); setCustomerView('welcome'); }}
          onBack={() => setCustomerView('welcome')}
        />
      );
    }

    return (
      <CustomerWelcome
        onReserve={() => setCustomerView('book')}
        onLookup={() => setCustomerView('lookup')}
        onWalkIn={() => setCustomerView('walkin')}
        onBrowseMenu={() => setCustomerView('browse')}
        onBackToRole={() => setRolePersist(null)}
      />
    );
  }

  // Staff flow needs login
  if (!user) return <LoginScreen onLogin={setUser} onBackToRole={() => setRolePersist(null)} />;

  const pendingBookingCount = bookings.filter(b => b.status === 'pending').length;

  const navItems = [
    { id: 'tables', ico: '🪑', label: 'Tables' },
    { id: 'order', ico: '🧾', label: 'Order' },
    { id: 'reservations', ico: '📅', label: 'Reserve' },
    { id: 'kds', ico: '👨‍🍳', label: 'Kitchen' },
    { id: 'forecast', ico: '📈', label: 'Forecast' },
    { id: 'inventory', ico: '📦', label: 'Inventory' },
    { id: 'history', ico: '📋', label: 'History' },
    { id: 'reports', ico: '📊', label: 'Reports' },
  ];

  const orderBody = activeOrder ? (
    <OrderScreen
      activeOrder={activeOrder} setActiveOrder={setActiveOrder} user={user}
      onSendKitchen={sendToKitchen} onPay={(o) => setPaying(o)}
      onSwitchTable={() => setShowSwitch(true)}
      eightySixed={eightySixed}
      onOpenMods={(item, addCb) => setModalItem({ item, addCb })}
    />
  ) : (
    <div className="empty-state" style={{ height: '100%' }}>
      <div style={{ fontSize: 48 }}>🧾</div>
      <div style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 16 }}>No active ticket</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Open a table or start a walk-in.</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn" onClick={() => setView('tables')}>View Tables</button>
        <button className="btn primary" onClick={startWalkIn}>+ Walk-In Order</button>
      </div>
      {openOrders.length > 0 && (
        <div style={{ marginTop: 24, width: 380 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>Open Tickets ({openOrders.length})</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {openOrders.map(o => (
              <button key={o.id} className="btn" style={{ justifyContent: 'space-between' }} onClick={() => setActiveOrderId(o.id)}>
                <span>
                  {o.source === 'customer' && <span className="cust-badge">📱 Customer</span>}
                  {o.tableLabel} · #{o.id} · {o.lines.length} items
                </span>
                <span className="mono">{aFmt(o.lines.reduce((s, l) => s + l.unit * l.qty, 0) * (1 + aTax))}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="app" data-density={tweaks.density}>
      <nav className="rail">
        <div className="rail-logo" title="Wabi Sabi · The Oberoi, Bangalore">{'WABI\nSABI'}</div>
        {navItems.map(n => (
          <button key={n.id} className={'rail-btn' + (view === n.id ? ' active' : '')} onClick={() => setView(n.id)} style={{ position: 'relative' }}>
            <span className="ico">{n.ico}</span>
            <span>{n.label}</span>
            {n.id === 'kds' && kdsTickets.length > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 8, background: 'var(--danger)', color: 'white', borderRadius: 999, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>{kdsTickets.length}</span>
            )}
            {n.id === 'order' && openOrders.length > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 8, background: 'var(--accent)', color: 'white', borderRadius: 999, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>{openOrders.length}</span>
            )}
            {n.id === 'reservations' && pendingBookingCount > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 8, background: 'var(--danger)', color: 'white', borderRadius: 999, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>{pendingBookingCount}</span>
            )}
          </button>
        ))}
        <div className="rail-spacer" />
        <button className="rail-btn" title="86 list" onClick={() => setShow86(true)} style={{ position: 'relative' }}>
          <span className="ico">🚫</span><span>86</span>
          {eightySixed.length > 0 && <span style={{ position: 'absolute', top: 6, right: 8, background: 'var(--warn)', color: 'oklch(0.30 0.05 80)', borderRadius: 999, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>{eightySixed.length}</span>}
        </button>
        <button className="rail-btn" title="Settings" onClick={() => window.toggleTweaks && window.toggleTweaks()}>
          <span className="ico">⚙️</span><span>Settings</span>
        </button>
        <button className="rail-btn" onClick={() => setUser(null)} title="Lock">
          <span className="ico">🔒</span><span>Lock</span>
        </button>
      </nav>

      <main className="main">
        <header className="topbar">
          <h1>{view === 'tables' ? 'Floor Plan' : view === 'order' ? 'Order Entry' : view === 'reservations' ? 'Reservations · 予約' : view === 'kds' ? 'Kitchen Display' : view === 'forecast' ? 'Demand Forecast' : view === 'inventory' ? 'Inventory' : view === 'history' ? 'Order History' : 'Reports'}</h1>
          <span className="crumb">Wabi Sabi · The Oberoi · Station 02</span>
          <div className="grow" />
          <button className="btn ghost" onClick={() => setShowCmd(true)} title="Command palette">
            <span style={{ fontSize: 13 }}>⌘ K</span><span style={{ color: 'var(--ink-3)', fontSize: 12 }}>Search anything…</span>
          </button>
          {view === 'tables' && (<button className="btn primary" onClick={startWalkIn}>+ New Walk-In</button>)}
          {view === 'order' && activeOrder && (<span className="pill"><span className="dot" />Editing #{activeOrder.id}</span>)}
          <Clock />
          <div className="user-chip" onClick={() => setUser(null)}>
            <div className="av">{user.initials}</div>
            <div><div className="name">{user.name}</div><div className="role">{user.role}</div></div>
          </div>
        </header>

        <section style={{ minHeight: 0, overflow: 'hidden' }}>
          {paying ? (
            <PaymentScreen order={paying} onClose={() => setPaying(null)} onComplete={completePayment} />
          ) : view === 'tables' ? (
            <TablesScreen tableState={tableState} setTableState={setTableState} orders={openOrders} openOrders={openOrders} onOpenTable={startOrderForTable} user={user} bookings={bookings} />
          ) : view === 'reservations' ? (
            <ReservationsScreen
              bookings={bookings}
              onApprove={approveBooking}
              onDecline={declineBooking}
              onSeat={seatBooking}
              onComplete={completeBooking}
              onCancel={cancelBooking}
            />
          ) : view === 'order' ? orderBody
          : view === 'kds' ? (
            <KdsScreen kdsTickets={kdsTickets} onBump={(id) => { setKdsTickets(t => t.filter(x => x.id !== id)); showToast('Order bumped ✓', 'ok'); }} onRecall={(id) => { setKdsTickets(t => t.filter(x => x.id !== id)); showToast('Order recalled', 'warn'); }} />
          ) : view === 'forecast' ? (
            <ForecastScreen openOrders={openOrders} history={history} kdsTickets={kdsTickets} eightySixed={eightySixed} setEightySixed={setEightySixed} />
          ) : view === 'inventory' ? (
            <InventoryScreen inventory={inventory} setInventory={setInventory} openOrders={openOrders} kdsTickets={kdsTickets} history={history} activity={invActivity} />
          ) : view === 'history' ? <HistoryScreen history={history} />
          : <ReportsScreen history={history} />}
        </section>
      </main>

      {showSwitch && (
        <div className="modal-veil" onClick={() => setShowSwitch(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 460 }}>
            <div className="modal-head"><h3>Switch ticket</h3></div>
            <div className="modal-body">
              {openOrders.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)' }}>No open tickets.</div>}
              <div style={{ display: 'grid', gap: 6, padding: '10px 0' }}>
                {openOrders.map(o => (
                  <button key={o.id} className="btn" style={{ justifyContent: 'space-between', padding: 14 }} onClick={() => { setActiveOrderId(o.id); setShowSwitch(false); }}>
                    <span><b>{o.tableLabel}</b> · #{o.id} · {o.lines.length} items</span>
                    <span className="mono">{aFmt(o.lines.reduce((s, l) => s + l.unit * l.qty, 0) * (1 + aTax))}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <div style={{ flex: 1 }} />
              <button className="btn" onClick={() => setShowSwitch(false)}>Cancel</button>
              <button className="btn primary" onClick={() => { startWalkIn(); setShowSwitch(false); }}>+ New Walk-In</button>
            </div>
          </div>
        </div>
      )}

      {modalItem && <ModifierModal item={modalItem.item} onClose={() => setModalItem(null)} onAdd={modalItem.addCb} />}
      {showCmd && <CommandPalette onClose={() => setShowCmd(false)} onCommand={handleCommand} />}
      {show86 && <EightySixModal eightySixed={eightySixed} setEightySixed={setEightySixed} onClose={() => setShow86(false)} />}
      {showMgr && <ManagerPin {...showMgr} onClose={() => setShowMgr(null)} onApprove={() => { showMgr.action(); setShowMgr(null); }} />}
      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
      {showImgMgr && <ImageManagerModal onClose={() => setShowImgMgr(false)} />}

      {tweaks.showShortcuts && !showCmd && (
        <div className="shortcuts">
          <kbd>⌘K</kbd> command · <kbd>/</kbd> search · <kbd>G</kbd>+<kbd>T/O/K/H/R</kbd> nav · <kbd>N</kbd> walk-in
        </div>
      )}

      {toast && <div className={'toast' + (toast.kind ? ' ' + toast.kind : '')}>{toast.msg}</div>}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Appearance">
          <TweakRadio label="Theme" value={tweaks.theme} options={[['light','Light'],['dark','Dark']]} onChange={v => setTweaks('theme', v)} />
          <TweakRadio label="Density" value={tweaks.density} options={[['compact','Compact'],['comfortable','Comfortable']]} onChange={v => setTweaks('density', v)} />
        </TweakSection>
        <TweakSection title="Behavior">
          <TweakToggle label="Show prices on menu" value={tweaks.showPrices} onChange={v => setTweaks('showPrices', v)} />
          <TweakToggle label="Kitchen overdue alerts" value={tweaks.kitchenAlerts} onChange={v => setTweaks('kitchenAlerts', v)} />
          <TweakToggle label="Show keyboard hints" value={tweaks.showShortcuts} onChange={v => setTweaks('showShortcuts', v)} />
        </TweakSection>
        <TweakSection title="AI provider · chat & insights">
          <AIProviderConfig />
        </TweakSection>
        <TweakSection title="AI provider · image generation">
          <ImageGenConfig />
        </TweakSection>
        <TweakSection title="Data">
          <TweakButton label="Manage 86 list" onClick={() => setShow86(true)} />
          <TweakButton label="Manage dish images" onClick={() => setShowImgMgr(true)} />
          <TweakButton label="Reset to demo data" onClick={() => {
            const seed = generateDemoData();
            setOpenOrders(seed.openOrders);
            setKdsTickets(seed.kdsTickets);
            setTableState(seed.tableState);
            setHistory(seed.history);
            setEightySixed(seed.eightySixed);
            setInventory(seed.inventory);
            setInvActivity(seed.invActivity);
            try { localStorage.setItem(SEED_DEMO_KEY, '1'); } catch {}
            showToast('Demo data loaded · ' + seed.history.length + ' orders', 'ok');
          }} />
          <TweakButton label="Switch role" onClick={() => { setRolePersist(null); setUser(null); }} />
          <TweakButton label="Clear all data" onClick={() => {
            setOpenOrders([]); setKdsTickets([]); setTableState({}); setHistory([]); setEightySixed([]); setInventory({}); setInvActivity([]);
            localStorage.removeItem(LS_KEY);
            try { localStorage.removeItem(SEED_DEMO_KEY); } catch {}
            showToast('All data cleared', 'ok');
          }} />
        </TweakSection>
      </TweaksPanel>

      {!tweaks.showPrices && <style>{`.menu-item .price { display: none; }`}</style>}
    </div>
  );
}

// ── Image manager: up to 8 angles per dish (drives 360° spin in DishXR) ───
const MAX_ANGLES = 8;
const MAX_FILE_BYTES = 2.5 * 1024 * 1024;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ImageManagerModal({ onClose }) {
  const D = window.POS_DATA;
  // Normalize storage into arrays so the UI doesn't have to branch.
  const norm = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : [])]));
  const [imgs, setImgs] = React.useState(() => norm(D.loadImgs()));
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkText, setBulkText] = React.useState('');
  const [bulkTarget, setBulkTarget] = React.useState(null);
  // Generation state per dish: { id: { progress, total, error?, abort?, busy } }
  const [genState, setGenState] = React.useState({});
  const [batchBusy, setBatchBusy] = React.useState(false);
  const [pexBatchBusy, setPexBatchBusy] = React.useState(false);
  const [pexState, setPexState] = React.useState({}); // { [id]: { busy, error } }
  const batchAbortRef = React.useRef(null);
  const pexBatchAbortRef = React.useRef(null);

  const persist = (next) => { setImgs(next); D.saveImgs(next); };

  // Generate up to 7 alternate angles for a single dish from its first photo.
  const generateForDish = async (item, currentImgs = imgs) => {
    const arr = currentImgs[item.id] || [];
    if (arr.length === 0) return { ok: false, reason: 'no source photo' };
    const cfg = window.AI?.getImgGenConfig?.();
    if (!cfg?.apiKey) return { ok: false, reason: 'no image-gen key' };
    const ctrl = new AbortController();
    setGenState(s => ({ ...s, [item.id]: { progress: 0, total: 7, busy: true, abort: () => ctrl.abort() } }));
    let working = currentImgs;
    try {
      await window.generateAngleVariants({
        sourceImageUrl: arr[0],
        dishName: item.name,
        count: Math.min(7, MAX_ANGLES - arr.length),
        signal: ctrl.signal,
        onProgress: ({ index, total, dataUrl, ok, error }) => {
          if (ok && dataUrl) {
            const cur = working[item.id] || [];
            const next = { ...working, [item.id]: [...cur, dataUrl].slice(0, MAX_ANGLES) };
            working = next;
            persist(next);
          }
          setGenState(s => ({ ...s, [item.id]: { ...(s[item.id] || {}), progress: index + 1, total, lastError: ok ? null : error, busy: true } }));
        },
      });
      setGenState(s => ({ ...s, [item.id]: { ...(s[item.id] || {}), busy: false } }));
      return { ok: true, imgs: working };
    } catch (e) {
      setGenState(s => ({ ...s, [item.id]: { ...(s[item.id] || {}), busy: false, lastError: e.message } }));
      return { ok: false, reason: e.message, imgs: working };
    }
  };

  const cancelGen = (id) => {
    const st = genState[id];
    if (st?.abort) st.abort();
    setGenState(s => ({ ...s, [id]: { ...(s[id] || {}), busy: false } }));
  };

  // Batch: run generation across every dish that has 1 source photo.
  const batchGenerate = async () => {
    const cfg = window.AI?.getImgGenConfig?.();
    if (!cfg?.apiKey) {
      alert('Add a Google Gemini API key in Settings → Image generation first.');
      return;
    }
    const targets = D.MENU.filter(it => (imgs[it.id] || []).length === 1);
    if (targets.length === 0) {
      alert('Upload one source photo per dish first — then I can generate angles for each.');
      return;
    }
    if (!confirm(`Generate 7 alternate angles for ${targets.length} dishes? This may take a few minutes and will use your Gemini quota.`)) return;
    batchAbortRef.current = false;
    setBatchBusy(true);
    let working = imgs;
    for (const it of targets) {
      if (batchAbortRef.current) break;
      const r = await generateForDish(it, working);
      if (r.imgs) working = r.imgs;
    }
    setBatchBusy(false);
  };
  const cancelBatch = () => { batchAbortRef.current = true; Object.keys(genState).forEach(cancelGen); setBatchBusy(false); };

  // Auto-fetch a source photo for a single dish (Pexels if a key is set,
  // else Wikipedia — no key needed).
  const fetchPexelsForDish = async (item, currentImgs = imgs) => {
    setPexState(s => ({ ...s, [item.id]: { busy: true } }));
    try {
      const r = await window.autoFetchDishPhoto({ dishName: item.name });
      if (!r || !r.url) {
        setPexState(s => ({ ...s, [item.id]: { busy: false, error: 'no results' } }));
        return { ok: false, imgs: currentImgs };
      }
      const cur = currentImgs[item.id] || [];
      const next = { ...currentImgs, [item.id]: [r.url, ...cur].slice(0, MAX_ANGLES) };
      persist(next);
      setPexState(s => ({ ...s, [item.id]: { busy: false, source: r.source } }));
      return { ok: true, imgs: next };
    } catch (e) {
      setPexState(s => ({ ...s, [item.id]: { busy: false, error: e.message } }));
      return { ok: false, imgs: currentImgs, error: e.message };
    }
  };

  // Batch: auto-fetch a source photo for every dish that has 0 photos.
  const batchFetchPexels = async () => {
    const targets = D.MENU.filter(it => (imgs[it.id] || []).length === 0);
    if (targets.length === 0) {
      alert('Every dish already has at least one photo. Use Clear all on a row to refetch.');
      return;
    }
    const haveKey = !!window.AI?.getPexelsKey?.();
    const sourceLabel = haveKey ? 'Pexels' : 'Wikipedia (no key needed)';
    if (!confirm(`Fetch a source photo from ${sourceLabel} for ${targets.length} dishes?`)) return;
    pexBatchAbortRef.current = false;
    setPexBatchBusy(true);
    let working = imgs;
    for (const it of targets) {
      if (pexBatchAbortRef.current) break;
      const r = await fetchPexelsForDish(it, working);
      if (r.imgs) working = r.imgs;
      // Small delay so we don't burn through rate limits in a hot loop
      await new Promise(res => setTimeout(res, 150));
    }
    setPexBatchBusy(false);
  };
  const cancelPexBatch = () => { pexBatchAbortRef.current = true; setPexBatchBusy(false); };

  const addImagesToDish = async (id, files) => {
    if (!files || files.length === 0) return;
    const cur = imgs[id] || [];
    const room = MAX_ANGLES - cur.length;
    if (room <= 0) { alert('Maximum 8 angles per dish.'); return; }
    const accepted = Array.from(files).slice(0, room);
    const oversize = accepted.find(f => f.size > MAX_FILE_BYTES);
    if (oversize) {
      alert(`"${oversize.name}" is over ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(1)}MB. Please use smaller files or paste URLs instead.`);
      return;
    }
    const dataUrls = await Promise.all(accepted.map(readFileAsDataURL));
    persist({ ...imgs, [id]: [...cur, ...dataUrls] });
  };

  const removeAt = (id, idx) => {
    const cur = imgs[id] || [];
    const next = cur.filter((_, i) => i !== idx);
    const m = { ...imgs };
    if (next.length === 0) delete m[id]; else m[id] = next;
    persist(m);
  };

  const moveSlot = (id, from, to) => {
    const cur = (imgs[id] || []).slice();
    if (to < 0 || to >= cur.length) return;
    [cur[from], cur[to]] = [cur[to], cur[from]];
    persist({ ...imgs, [id]: cur });
  };

  const addUrls = (id, urls) => {
    const cur = imgs[id] || [];
    const cleaned = urls.map(u => u.trim()).filter(Boolean);
    const merged = [...cur, ...cleaned].slice(0, MAX_ANGLES);
    if (merged.length === 0) { const m = { ...imgs }; delete m[id]; persist(m); return; }
    persist({ ...imgs, [id]: merged });
  };

  const items = D.MENU.filter(m =>
    (filter === 'all' || m.cat === filter) &&
    (!search.trim() || m.name.toLowerCase().includes(search.trim().toLowerCase()))
  );

  const totalSet = Object.values(imgs).reduce((s, arr) => s + arr.length, 0);
  const dishesWith = Object.values(imgs).filter(arr => arr.length > 0).length;

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal img-mgr" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Manage dish images</h3>
          <span className="pill"><span className="dot" />{dishesWith} dishes · {totalSet} photos</span>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="cu-search" style={{ flex: 1, minWidth: 220 }}>
              <span className="ico">🔍</span>
              <input placeholder="Search dishes…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="twk-field" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All categories</option>
              {D.CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.ico} {c.name}</option>)}
            </select>
            <button className="btn" onClick={() => { if (confirm('Clear all custom images?')) persist({}); }}>Clear all</button>
          </div>

          <div className="img-mgr-tip">
            💡 <b>Best workflow:</b> Upload <b>1 source photo</b> per dish, then click <b>🪄 Generate angles</b> — Nano Banana (Gemini 2.5 Flash Image) creates 7 alternate angles maintaining the dish's identity. Drag-spin in the AR/3D viewer rotates through all 8 frames as a real 360°.
          </div>

          <div className="img-mgr-batch">
            <button
              className="btn primary"
              disabled={pexBatchBusy}
              onClick={batchFetchPexels}
              title="Fetch a source photo for every dish that has zero photos. Uses Pexels if a key is set, otherwise Wikipedia (no key needed)."
            >
              {pexBatchBusy
                ? <><span className="cu-spin" /> Fetching…</>
                : (window.AI?.getPexelsKey?.() ? '🌐 Auto-fetch source photos (Pexels)' : '🌐 Auto-fetch source photos (Wikipedia, no key needed)')}
            </button>
            {pexBatchBusy && <button className="btn" onClick={cancelPexBatch}>Cancel</button>}
            <button
              className="btn"
              disabled={batchBusy}
              onClick={batchGenerate}
              title="Generate 7 alternate angles for every dish that has 1 source photo"
            >
              {batchBusy ? <><span className="cu-spin" /> Generating…</> : '🪄 Generate 360° angles for all dishes'}
            </button>
            {batchBusy && <button className="btn" onClick={cancelBatch}>Cancel</button>}
            <div style={{ flex: 1, fontSize: 11, color: 'var(--ink-3)' }}>
              Wikipedia works keylessly · paste a Pexels key in Settings for higher-quality photos.
            </div>
          </div>

          <div className="img-mgr-grid">
            {items.map(item => {
              const arr = imgs[item.id] || [];
              const m = D.meta(item.id);
              return (
                <div key={item.id} className="img-mgr-row">
                  <div className="img-mgr-thumb" style={{ background: arr[0] ? `center/cover no-repeat url(${arr[0]})` : m.gradient }}>
                    {!arr[0] && <span style={{ fontSize: 26 }}>{item.swatch}</span>}
                    {arr.length > 1 && <span className="img-mgr-count">{arr.length}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="img-mgr-name">{item.name}</div>
                    <div className="img-mgr-cat">{D.CATEGORIES.find(c => c.id === item.cat)?.name} · {arr.length}/{MAX_ANGLES} angles</div>

                    {/* Slots */}
                    <div className="img-mgr-slots">
                      {arr.map((src, i) => (
                        <div key={i} className="img-mgr-slot" style={{ backgroundImage: `url("${src}")` }}>
                          <div className="img-mgr-slot-num">{i + 1}</div>
                          <div className="img-mgr-slot-actions">
                            {i > 0 && <button title="Move left" onClick={() => moveSlot(item.id, i, i - 1)}>‹</button>}
                            {i < arr.length - 1 && <button title="Move right" onClick={() => moveSlot(item.id, i, i + 1)}>›</button>}
                            <button title="Remove" onClick={() => removeAt(item.id, i)}>✕</button>
                          </div>
                        </div>
                      ))}
                      {arr.length < MAX_ANGLES && (
                        <label className="img-mgr-slot empty" title="Add photos">
                          <span style={{ fontSize: 22 }}>＋</span>
                          <input
                            type="file" accept="image/*" multiple
                            style={{ display: 'none' }}
                            onChange={e => addImagesToDish(item.id, e.target.files)}
                          />
                        </label>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {arr.length === 0 && (
                        pexState[item.id]?.busy ? (
                          <button className="btn"><span className="cu-spin" style={{ marginRight: 6 }} /> Pexels…</button>
                        ) : (
                          <button className="btn" onClick={() => fetchPexelsForDish(item)} title="Fetch a source photo from Pexels">🌐 Pexels</button>
                        )
                      )}
                      <button className="btn" onClick={() => { setBulkTarget(item.id); setBulkOpen(true); setBulkText(''); }}>📋 Paste URLs</button>
                      {arr.length > 0 && arr.length < MAX_ANGLES && (
                        genState[item.id]?.busy ? (
                          <button className="btn" onClick={() => cancelGen(item.id)}>
                            <span className="cu-spin" style={{ marginRight: 6 }} />
                            {genState[item.id].progress}/{genState[item.id].total} · Cancel
                          </button>
                        ) : (
                          <button className="btn primary" onClick={() => generateForDish(item)}>
                            🪄 Generate angles
                          </button>
                        )
                      )}
                      {(genState[item.id]?.lastError || pexState[item.id]?.error) && !genState[item.id]?.busy && !pexState[item.id]?.busy && (
                        <span style={{ fontSize: 11, color: 'var(--danger)' }} title={genState[item.id]?.lastError || pexState[item.id]?.error}>⚠ {(genState[item.id]?.lastError || pexState[item.id]?.error).slice(0, 40)}…</span>
                      )}
                      {arr.length > 0 && <button className="btn" onClick={() => { const m = { ...imgs }; delete m[item.id]; persist(m); }}>Clear all</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-3)' }}>
            Stored locally · supports JPG / PNG / WebP up to 2.5MB each. URLs work too (CDN, Unsplash). The 3D / AR / VR viewer picks them up immediately.
          </div>
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>

      {bulkOpen && bulkTarget && (
        <div className="modal-veil" onClick={() => setBulkOpen(false)} style={{ zIndex: 110 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal-head"><h3>Paste URLs</h3>
              <div style={{ flex: 1 }} />
              <button className="btn ghost" onClick={() => setBulkOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>One URL per line. They'll be appended in order to the angle slots.</div>
              <textarea
                className="notes"
                style={{ minHeight: 160, width: '100%' }}
                placeholder="https://example.com/butter-chicken-front.jpg&#10;https://example.com/butter-chicken-45.jpg&#10;..."
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setBulkOpen(false)}>Cancel</button>
              <div style={{ flex: 1 }} />
              <button className="btn primary" onClick={() => {
                addUrls(bulkTarget, bulkText.split(/\r?\n/));
                setBulkOpen(false);
              }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AIProviderConfig() {
  const [cfg, setCfg] = React.useState(() => window.AI?.getConfig?.() || { provider: 'anthropic', apiKey: '' });
  const [show, setShow] = React.useState(false);
  const update = (patch) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    window.AI?.setConfig?.(next);
  };
  const provider = cfg.provider || 'anthropic';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="twk-row">
        <div className="twk-lbl"><span>Provider</span></div>
        <select className="twk-field" value={provider} onChange={e => update({ provider: e.target.value })}>
          <option value="anthropic">Anthropic Claude</option>
          <option value="azure">Azure OpenAI</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      {provider === 'azure' && (
        <>
          <div className="twk-row">
            <div className="twk-lbl"><span>Endpoint</span></div>
            <input
              className="twk-field"
              placeholder="https://your-resource.openai.azure.com/openai/v1/"
              value={cfg.endpoint || ''}
              onChange={e => update({ endpoint: e.target.value.trim() })}
            />
          </div>
          <div className="twk-row">
            <div className="twk-lbl"><span>Chat deployment</span></div>
            <input
              className="twk-field"
              placeholder="e.g. gpt-5.1, gpt-4o"
              value={cfg.deployment || ''}
              onChange={e => update({ deployment: e.target.value.trim() })}
            />
          </div>
          <div className="twk-row">
            <div className="twk-lbl"><span>Transcribe deployment</span></div>
            <input
              className="twk-field"
              placeholder="gpt-4o-transcribe (optional)"
              value={cfg.transcribeDeployment || ''}
              onChange={e => update({ transcribeDeployment: e.target.value.trim() })}
            />
          </div>
          <div className="twk-row">
            <div className="twk-lbl"><span>TTS deployment</span></div>
            <input
              className="twk-field"
              placeholder="gpt-4o-mini-tts (optional)"
              value={cfg.ttsDeployment || ''}
              onChange={e => update({ ttsDeployment: e.target.value.trim() })}
            />
          </div>
          <div className="twk-row">
            <div className="twk-lbl"><span>Realtime deployment</span></div>
            <input
              className="twk-field"
              placeholder="gpt-realtime (needs server proxy)"
              value={cfg.realtimeDeployment || ''}
              onChange={e => update({ realtimeDeployment: e.target.value.trim() })}
            />
          </div>
        </>
      )}

      {provider === 'openai' && (
        <div className="twk-row">
          <div className="twk-lbl"><span>Model</span></div>
          <input
            className="twk-field"
            placeholder="gpt-4o-mini"
            value={cfg.model || ''}
            onChange={e => update({ model: e.target.value.trim() })}
          />
        </div>
      )}

      <div className="twk-row">
        <div className="twk-lbl">
          <span>API key</span>
          <span className="twk-val">{cfg.apiKey ? '✓ saved' : 'required'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type={show ? 'text' : 'password'}
            className="twk-field"
            placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-… or Azure key'}
            value={cfg.apiKey || ''}
            onChange={e => update({ apiKey: e.target.value.trim() })}
            style={{ flex: 1 }}
          />
          <button type="button" className="twk-btn secondary" onClick={() => setShow(s => !s)} title={show ? 'Hide' : 'Show'}>{show ? '🙈' : '👁'}</button>
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'rgba(41,38,27,.55)', lineHeight: 1.45 }}>
        {provider === 'anthropic' && 'Uses Claude Haiku 4.5 directly from your browser (anthropic-dangerous-direct-browser-access).'}
        {provider === 'azure' && 'Uses your Azure OpenAI v1 endpoint for chat, transcription, and TTS. Realtime needs a server proxy to mint ephemeral tokens — don\'t expose the raw key for it. CORS errors → enable CORS on the resource or run a local proxy.'}
        {provider === 'openai' && 'Uses api.openai.com directly from your browser.'}
        {' '}Key stays in this browser.
      </div>
    </div>
  );
}

function ImageGenConfig() {
  const [cfg, setCfg] = React.useState(() => window.AI?.getImgGenConfig?.() || { provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash-image-preview' });
  const [pexelsKey, setPexelsKeyState] = React.useState(() => window.AI?.getPexelsKey?.() || '');
  const [show, setShow] = React.useState(false);
  const [showPex, setShowPex] = React.useState(false);
  const update = (patch) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    window.AI?.setImgGenConfig?.(next);
  };
  const updatePexels = (v) => {
    setPexelsKeyState(v);
    window.AI?.setPexelsKey?.(v);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="twk-sect" style={{ padding: 0, marginBottom: -4 }}>Pexels (auto-fetch source photos)</div>
      <div className="twk-row">
        <div className="twk-lbl">
          <span>Pexels API key</span>
          <span className="twk-val">{pexelsKey ? '✓ saved' : 'free at pexels.com/api'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type={showPex ? 'text' : 'password'}
            className="twk-field"
            placeholder="paste your Pexels key"
            value={pexelsKey}
            onChange={e => updatePexels(e.target.value.trim())}
            style={{ flex: 1 }}
          />
          <button type="button" className="twk-btn secondary" onClick={() => setShowPex(s => !s)}>{showPex ? '🙈' : '👁'}</button>
        </div>
      </div>

      <div className="twk-sect" style={{ padding: 0, marginBottom: -4 }}>Image generator (alternate angles)</div>
      <div className="twk-row">
        <div className="twk-lbl"><span>Provider</span></div>
        <select className="twk-field" value={cfg.provider || 'gemini'} onChange={e => update({ provider: e.target.value })}>
          <option value="gemini">Google Gemini · Nano Banana</option>
        </select>
      </div>
      <div className="twk-row">
        <div className="twk-lbl"><span>Model</span></div>
        <input
          className="twk-field"
          placeholder="gemini-2.5-flash-image-preview"
          value={cfg.model || ''}
          onChange={e => update({ model: e.target.value.trim() })}
        />
      </div>
      <div className="twk-row">
        <div className="twk-lbl">
          <span>Google API key</span>
          <span className="twk-val">{cfg.apiKey ? '✓ saved' : 'required'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type={show ? 'text' : 'password'}
            className="twk-field"
            placeholder="AIza…"
            value={cfg.apiKey || ''}
            onChange={e => update({ apiKey: e.target.value.trim() })}
            style={{ flex: 1 }}
          />
          <button type="button" className="twk-btn secondary" onClick={() => setShow(s => !s)}>{show ? '🙈' : '👁'}</button>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(41,38,27,.55)', lineHeight: 1.45 }}>
        Pexels seeds one source photo per dish. Gemini fans it into 7 alternate angles for the 360° spin. Both keys stay in this browser.
      </div>
    </div>
  );
}

function Clock() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return (<span className="pill" title="Current time">🕒 {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

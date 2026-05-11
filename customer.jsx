// Customer-facing flow: role select → order (voice + manual) → live status.
const { CATEGORIES: cuCAT, MENU: cuMENU, MOD_GROUPS: cuMODS, fmt: cuFmt, TAX_RATE: cuTAX, uid: cuUid } = window.POS_DATA;

// ── Role select ────────────────────────────────────────────────────────────
function RoleSelect({ onPick }) {
  return (
    <div className="role-screen akane">
      <div className="role-card akane">
        <div className="role-logo akane-logo">{'WABI\nSABI'}</div>
        <h1 className="akane-title">Wabi Sabi</h1>
        <div className="role-tag">Welcome — how may we host you this evening?</div>
        <div className="role-grid">
          <button className="role-btn customer" onClick={() => onPick('customer')}>
            <div className="role-ico">🍣</div>
            <div className="role-name">I'm a Guest</div>
            <div className="role-sub">Order with voice · AR menu · concierge AI</div>
          </button>
          <button className="role-btn staff" onClick={() => onPick('staff')}>
            <div className="role-ico">🍶</div>
            <div className="role-name">Restaurant Staff</div>
            <div className="role-sub">POS · kitchen · tables · reports</div>
          </button>
        </div>
        <div className="role-foot">The Oberoi · Bangalore</div>
      </div>
    </div>
  );
}

// ── Customer order screen ─────────────────────────────────────────────────
function CustomerApp({ onBackToRole, onSubmitOrder, myOrder, onSwitchRole, prefill, orderingLocked, unlockAt, onBackToBooking }) {
  const [activeCat, setActiveCat] = React.useState('starters');
  const [search, setSearch] = React.useState('');
  const [cart, setCart] = React.useState([]); // [{itemId, qty, mods, notes, lineId, unit}]
  const [name, setName] = React.useState(prefill?.customerName || '');
  const [diningMode, setDiningMode] = React.useState('dinein'); // 'dinein' | 'takeaway'
  const [tableNo, setTableNo] = React.useState(prefill?.tableNo || '');
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiToast, setAiToast] = React.useState(null);
  const [showCart, setShowCart] = React.useState(false);
  const [modItem, setModItem] = React.useState(null);
  const [arItem, setArItem] = React.useState(null);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState([]); // [{role, content}]
  const [chatBusy, setChatBusy] = React.useState(false);
  const [chatVoice, setChatVoice] = React.useState(true);

  const speech = useSpeech({
    onFinal: (chunk) => {
      // chunks fire continuously while listening; do nothing here, parse on stop
    },
  });

  // Auto-parse when user stops listening and we have transcript
  const lastParsedRef = React.useRef('');
  React.useEffect(() => {
    if (!speech.listening && speech.transcript && speech.transcript !== lastParsedRef.current) {
      lastParsedRef.current = speech.transcript;
      handleAIParse(speech.transcript);
    }
  }, [speech.listening, speech.transcript]);

  // ── Auto-fetch dish photos on mount ───────────────────────────────────────
  // Walks menu items missing a photo and fetches one from Pexels (preferred)
  // or Wikipedia (keyless fallback). Background — items render their gradient
  // until the photo arrives, then upgrade in-place. Saves to localStorage so
  // subsequent loads are instant. Sequential to be polite to free APIs.
  const [photoTick, setPhotoTick] = React.useState(0); // bumps to re-render on save
  React.useEffect(() => {
    const D = window.POS_DATA;
    const fetcher = window.autoFetchDishPhoto;
    if (!D || !fetcher) return;
    let cancelled = false;
    const ctrl = new AbortController();
    // For each dish we'll try a few query variants — the bare dish name is
    // usually best, but appending the cuisine helps Wikipedia disambiguate
    // generic words like "Tonkotsu" or "Hibiki 17" to the correct article.
    const queriesFor = (item) => {
      const stripped = item.name.replace(/\s*\(.*?\)\s*/g, '').trim();
      const q1 = stripped;
      const q2 = stripped + ' japanese';
      const q3 = stripped + ' japanese food';
      // Drop duplicates while preserving order
      const seen = new Set();
      return [q1, q2, q3].filter(q => { if (seen.has(q)) return false; seen.add(q); return true; });
    };
    (async () => {
      const existing = D.loadImgs();
      for (const item of cuMENU) {
        if (cancelled) return;
        if (existing[item.id]) continue;
        // Skip items that already have a hand-curated default image shipped
        // with the app — auto-fetched photos shouldn't override those.
        if (D.imgFor(item.id)) continue;
        let url = null;
        for (const q of queriesFor(item)) {
          if (cancelled) return;
          try {
            const r = await fetcher({ dishName: q, signal: ctrl.signal });
            if (r?.url) { url = r.url; break; }
          } catch (e) {
            if (e.name === 'AbortError') return;
          }
        }
        if (!url) continue;
        const cur = D.loadImgs();
        cur[item.id] = url;
        D.saveImgs(cur);
        if (!cancelled) setPhotoTick(t => t + 1);
        // Polite throttle so we don't hammer Wikipedia
        await new Promise(res => setTimeout(res, 220));
      }
    })();
    return () => { cancelled = true; ctrl.abort(); };
  }, []);

  const showAi = (msg, kind) => { setAiToast({ msg, kind }); setTimeout(() => setAiToast(null), 3200); };

  const handleAIParse = async (text) => {
    if (!text || !text.trim()) return;
    setAiBusy(true);
    try {
      const r = await parseOrder(text, cuMENU);
      const added = [];
      for (const x of r.items) {
        const item = cuMENU.find(m => m.id === x.itemId);
        if (!item) continue;
        addToCart(item, [], x.note || '', x.qty);
        added.push(`${x.qty}× ${item.name}`);
      }
      if (added.length) {
        showAi(`${r.mode === 'ai' ? '🤖' : '✨'} Added: ${added.join(', ')}`, 'ok');
      } else {
        showAi(r.missing?.length ? `Couldn't find: ${r.missing.join(', ')}` : "Sorry — didn't catch any items. Try again?", 'warn');
      }
    } catch (e) {
      showAi('Could not parse order: ' + e.message, 'warn');
    } finally {
      setAiBusy(false);
    }
  };

  const handleTextSearch = async () => {
    const q = search.trim();
    if (!q) return;
    // If query looks like a sentence, parse it. Otherwise just filter menu.
    if (q.split(/\s+/).length >= 3 || /\b(want|like|get|order|please|ek|do|teen|chahiye)\b/i.test(q)) {
      handleAIParse(q);
      setSearch('');
    }
  };

  const filtered = React.useMemo(() => {
    // VR/3D-enabled items float to the top of every list so demo viewers
    // see the showpieces first. Array.prototype.sort is stable, so the
    // curated MENU order is preserved inside each group.
    const sortVR = (a, b) => Number(!!window.POS_DATA.modelFor(b.id)) - Number(!!window.POS_DATA.modelFor(a.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      return cuMENU.filter(x => x.name.toLowerCase().includes(q) || (x.desc || '').toLowerCase().includes(q)).slice(0, 30).sort(sortVR);
    }
    return cuMENU.filter(x => x.cat === activeCat).sort(sortVR);
  }, [activeCat, search]);

  // Guests browsing before their reservation window is open can preview the
  // menu but cannot stage items in the cart. Surface a quiet sumi toast and
  // bail before mutating cart state. Walk-ins and unlocked bookings hit the
  // normal path.
  const addToCart = (item, mods, notes, qty) => {
    if (orderingLocked) {
      const when = unlockAt ? new Date(unlockAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'soon';
      setAiToast({ msg: `Ordering opens at ${when} · 30 min before your arrival`, kind: 'lock' });
      setTimeout(() => setAiToast(null), 2400);
      return;
    }
    const addPrice = (mods || []).reduce((s, m) => s + (m.addPrice || 0), 0);
    const line = {
      lineId: cuUid(), itemId: item.id, name: item.name, cat: item.cat,
      basePrice: item.price, mods: mods || [], notes: notes || '', qty: qty || 1,
      unit: item.price + addPrice, sent: false, seat: 0,
      course: item.cat === 'starters' ? 'starter' : item.cat === 'desserts' ? 'dessert'
            : (item.cat === 'drinks' || item.cat === 'bar') ? 'drink' : 'main',
    };
    setCart(c => [...c, line]);
  };

  const onPickItem = (item) => {
    const groups = cuMODS[item.cat];
    if (groups && groups.length) setModItem(item);
    else addToCart(item, [], '', 1);
  };

  // ── Conversational chat (Claude as a host) ──────────────────────────────
  const sendChat = async (userText) => {
    const text = (userText || '').trim();
    if (!text || chatBusy) return;
    const cfg = window.AI?.getConfig?.() || {};
    const newUserMsg = { role: 'user', content: text };
    setChatMessages(m => [...m, newUserMsg]);
    if (!cfg.apiKey) {
      // Heuristic fallback when no AI provider — parse text as an order
      setChatBusy(true);
      try {
        const r = await parseOrder(text, cuMENU);
        let added = [];
        for (const x of r.items) {
          const it = cuMENU.find(m => m.id === x.itemId);
          if (it) { addToCart(it, [], x.note || '', x.qty); added.push(`${x.qty}× ${it.name}`); }
        }
        const reply = added.length
          ? `Added ${added.join(', ')}. Anything else?`
          : `I can take orders even without an AI key — try "one tonkotsu ramen and a sake" or "two wagyu tataki, a tempura, and a hibiki". (For free-form conversation, add an Anthropic / OpenAI key in Settings → AI.)`;
        setChatMessages(m => [...m, { role: 'assistant', content: reply }]);
        if (chatVoice) speak(reply);
      } finally { setChatBusy(false); }
      return;
    }
    setChatBusy(true);
    try {
      let convo = [...chatMessages, newUserMsg];
      // Up to 3 tool-call rounds. Provider-agnostic via callAI/chatWithAI.
      for (let round = 0; round < 3; round++) {
        const r = await chatWithAI({ messages: convo, menu: cuMENU });
        if (r.toolCalls && r.toolCalls.length) {
          // Render the assistant turn (mostly empty content, surfaces tools used)
          setChatMessages(m => [...m, { role: 'assistant', content: r.text || '', _toolCalls: r.toolCalls }]);
          // Resolve each tool call client-side
          const toolMessages = [];
          for (const tc of r.toolCalls) {
            let result = 'ok';
            if (tc.name === 'add_to_cart') {
              const item = cuMENU.find(x => x.id === tc.args?.itemId);
              if (item) {
                addToCart(item, [], tc.args.note || '', Math.max(1, parseInt(tc.args.qty || 1, 10)));
                result = 'added';
              } else {
                result = 'item not found';
              }
            }
            toolMessages.push({ role: 'tool', tool_call_id: tc.id, content: result });
          }
          // Provider-agnostic shape — Anthropic/OpenAI both supported
          // For OpenAI we need an assistant message describing the tool calls so the
          // model can read them back; the raw response is preserved in r.raw.
          if (r.raw?.choices) {
            const m = r.raw.choices[0]?.message;
            if (m) convo.push(m);
          } else if (r.raw?.content) {
            convo.push({ role: 'assistant', content: r.raw.content });
          } else {
            convo.push({ role: 'assistant', content: r.text || '' });
          }
          convo.push(...toolMessages);
          continue;
        }
        const reply = r.text || '(silent)';
        setChatMessages(m => [...m, { role: 'assistant', content: reply }]);
        if (chatVoice) speak(reply);
        break;
      }
    } catch (e) {
      const msg = 'Sorry — I had trouble: ' + e.message;
      setChatMessages(m => [...m, { role: 'assistant', content: msg }]);
    } finally {
      setChatBusy(false);
    }
  };

  const updateQty = (lineId, delta) => setCart(c => c.map(l => l.lineId === lineId ? { ...l, qty: Math.max(0, l.qty + delta) } : l).filter(l => l.qty > 0));
  const removeLine = (lineId) => setCart(c => c.filter(l => l.lineId !== lineId));

  const subtotal = cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const tax = subtotal * cuTAX;
  const total = subtotal + tax;

  const placeOrder = () => {
    if (cart.length === 0) return;
    if (orderingLocked) {
      const when = unlockAt ? new Date(unlockAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'soon';
      setAiToast({ msg: `Ordering opens at ${when}`, kind: 'lock' });
      setTimeout(() => setAiToast(null), 2400);
      return;
    }
    const orderId = 'C' + Date.now().toString().slice(-5);
    const tableLabel = diningMode === 'dinein' && tableNo ? `Table ${tableNo} · Customer` : (diningMode === 'takeaway' ? 'Takeaway · Customer' : 'Customer App');
    const order = {
      id: orderId,
      tableId: 'customer-' + cuUid(),
      tableLabel,
      guests: 1,
      server: name ? name : 'Customer App',
      lines: cart,
      discount: 0,
      note: diningMode === 'takeaway' ? 'TAKEAWAY' : `Dine-in${tableNo ? ' · Table ' + tableNo : ''}`,
      openedAt: Date.now(),
      source: 'customer',
      customerName: name || 'Guest',
      diningMode,
      tableNo,
    };
    onSubmitOrder(order);
    setCart([]);
    setShowCart(false);
  };

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  // If we have an active customer order, show the status screen
  if (myOrder) return <CustomerStatus order={myOrder} onSwitchRole={onSwitchRole} />;

  return (
    <div className="customer-app">
      <header className="cu-top">
        <div className="cu-brand akane">
          <div className="cu-logo akane-logo">{'WABI\nSABI'}</div>
          <div>
            <div className="cu-name akane-title">Wabi Sabi</div>
            <div className="cu-sub">{orderingLocked ? 'Browse · Menu Preview' : 'The Oberoi · Voice & AR Concierge'}</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {onBackToBooking && (
          <button className="btn ghost" onClick={onBackToBooking} title={prefill ? 'Back to your reservation' : 'Back'}>{prefill ? '← Reservation' : '← Back'}</button>
        )}
        <button className="btn ghost" onClick={onBackToRole} title="Switch role">⇄ Switch</button>
      </header>

      {orderingLocked && (
        <div className="cu-lock-banner">
          <span className="cu-lock-ico">🔒</span>
          <span className="cu-lock-text">
            {unlockAt ? (
              <><b>Browse mode.</b> You may view the menu now — ordering opens at{' '}
              <b>{new Date(unlockAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</b>
              {' '}(30 min before your reservation).</>
            ) : (
              <><b>Preview only.</b> Reserve a table to place an order.</>
            )}
          </span>
        </div>
      )}

      {prefill && (
        <div className="cu-prefill-banner">
          <span style={{ fontSize: 18 }}>🪑</span>
          <div>
            <b>Welcome, {prefill.customerName}.</b> You're at Table {prefill.tableNo} · {prefill.partySize} {prefill.partySize === 1 ? 'guest' : 'guests'}.
          </div>
          <div style={{ flex: 1 }} />
          <span className="cu-prefill-tag">Reserved</span>
        </div>
      )}

      <div className="cu-search-row">
        <div className="cu-search">
          <span className="ico">🔍</span>
          <input
            placeholder='Search menu, or type "one tonkotsu ramen and a yuzu highball"'
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleTextSearch(); }}
          />
          {search && <button className="cu-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <button
          className={'cu-mic' + (speech.listening ? ' listening' : '') + (aiBusy ? ' busy' : '')}
          onClick={() => speech.listening ? speech.stop() : speech.start()}
          disabled={!speech.supported || aiBusy}
          title={speech.supported ? 'Speak your order' : 'Voice not supported in this browser'}
        >
          {aiBusy ? <span className="cu-spin" /> : <span className="cu-mic-ico">{speech.listening ? '⏹' : '🎙️'}</span>}
          <span className="cu-mic-lbl">{aiBusy ? 'Thinking…' : speech.listening ? 'Stop' : 'Speak'}</span>
        </button>
      </div>

      {(speech.listening || speech.transcript || speech.interim) && (
        <div className={'cu-listen' + (speech.listening ? ' on' : '')}>
          {speech.listening && <span className="cu-pulse" />}
          <div style={{ flex: 1 }}>
            <div className="cu-listen-lbl">{speech.listening ? 'Listening…' : 'Heard:'}</div>
            <div className="cu-listen-text">
              {speech.transcript}
              {speech.interim && <span style={{ opacity: 0.5 }}> {speech.interim}</span>}
              {!speech.transcript && !speech.interim && <span style={{ opacity: 0.5 }}>Try: "I'd like two butter chickens with extra gravy and a sweet lassi."</span>}
            </div>
          </div>
          {!speech.listening && speech.transcript && (
            <button className="btn ghost" onClick={() => { speech.reset(); lastParsedRef.current = ''; }}>Clear</button>
          )}
        </div>
      )}

      <div className="cu-cats">
        {cuCAT.map(c => (
          <button key={c.id} className={'cu-cat' + (activeCat === c.id && !search ? ' active' : '')} onClick={() => { setActiveCat(c.id); setSearch(''); }}>
            <span>{c.ico}</span><span>{c.name}</span>
          </button>
        ))}
      </div>

      <div className="cu-feed">
        {filtered.map(item => {
          const m = window.POS_DATA.meta(item.id);
          const photo = window.POS_DATA.imgFor(item.id);
          const catColor = (cuCAT.find(c => c.id === item.cat) || {}).color || 'var(--bg-2)';
          return (
            <article
              key={item.id}
              className={'cu-feed-card' + (photo ? '' : ' no-photo')}
              onClick={() => onPickItem(item)}
              style={!photo ? { background: m.gradient || catColor } : undefined}
            >
              {photo && (
                <div
                  className="cu-feed-photo"
                  style={{ backgroundImage: `url("${photo}")` }}
                  aria-label={item.name}
                />
              )}
              {!photo && <span className="cu-feed-fallback">{item.swatch}</span>}

              {item.popular && <span className="cu-feed-pop">★ Popular</span>}
              <button
                className="cu-feed-ar"
                onClick={(e) => { e.stopPropagation(); setArItem(item); }}
                title="View dish in AR / 3D"
              >✨ AR</button>

              <div className="cu-feed-overlay">
                <div className="cu-feed-name">{item.name}</div>
                {item.desc && <div className="cu-feed-desc">{item.desc}</div>}
                <div className="cu-feed-meta">
                  <span title="Prep time">⏱ {m.prep}m</span>
                  <span title="Spice">🌶 {'●'.repeat(m.spice) + '○'.repeat(Math.max(0, 3 - m.spice))}</span>
                  <span title="Diet">{m.vegetarian ? '🟢 veg' : '🔴 non-veg'}</span>
                </div>
                <div className="cu-feed-foot">
                  <span className="cu-feed-price">{cuFmt(item.price)}</span>
                  <button
                    className="cu-feed-add"
                    onClick={(e) => { e.stopPropagation(); onPickItem(item); }}
                  >＋ Add</button>
                </div>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1', minHeight: 200 }}>
            <div style={{ fontSize: 28 }}>🔎</div><div>No items match "{search}"</div>
          </div>
        )}
      </div>

      <div className={'cu-cartbar' + (cartCount > 0 ? ' show' : '')}>
        <div className="cu-cartbar-info">
          <div className="cu-cartbar-count">{cartCount} item{cartCount === 1 ? '' : 's'}</div>
          <div className="cu-cartbar-total">{cuFmt(total)}</div>
        </div>
        <button className="btn primary lg" onClick={() => setShowCart(true)}>Review &amp; Order →</button>
      </div>

      {showCart && (
        <div className="modal-veil" onClick={() => setShowCart(false)}>
          <div className="modal cu-cart-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Your Order</h3>
              <div style={{ flex: 1 }} />
              <button className="btn ghost" onClick={() => setShowCart(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="cu-form">
                <label className="cu-field">
                  <span>Your name</span>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Optional" />
                </label>
                <div className="cu-field">
                  <span>Dining</span>
                  <div className="cu-seg">
                    <button className={diningMode === 'dinein' ? 'on' : ''} onClick={() => setDiningMode('dinein')}>🍽 Dine-in</button>
                    <button className={diningMode === 'takeaway' ? 'on' : ''} onClick={() => setDiningMode('takeaway')}>🥡 Takeaway</button>
                  </div>
                </div>
                {diningMode === 'dinein' && (
                  <label className="cu-field">
                    <span>Table # (optional)</span>
                    <input value={tableNo} onChange={e => setTableNo(e.target.value)} placeholder="e.g. 12" />
                  </label>
                )}
              </div>

              <div className="cu-cart-lines">
                {cart.map(l => (
                  <div key={l.lineId} className="cu-cart-line">
                    <div className="cu-cart-q">
                      <button onClick={() => updateQty(l.lineId, -1)}>−</button>
                      <span>{l.qty}</span>
                      <button onClick={() => updateQty(l.lineId, 1)}>+</button>
                    </div>
                    <div className="cu-cart-info">
                      <div className="cu-cart-name">{l.name}</div>
                      {l.mods.length > 0 && <div className="cu-cart-mods">{l.mods.map(m => m.name).join(' · ')}</div>}
                      {l.notes && <div className="cu-cart-mods" style={{ fontStyle: 'italic' }}>“{l.notes}”</div>}
                    </div>
                    <div className="cu-cart-price">{cuFmt(l.unit * l.qty)}</div>
                    <button className="cu-cart-del" onClick={() => removeLine(l.lineId)} title="Remove">✕</button>
                  </div>
                ))}
              </div>

              <div className="cu-cart-totals">
                <div className="row"><span>Subtotal</span><span className="mono">{cuFmt(subtotal)}</span></div>
                <div className="row"><span>GST (5%)</span><span className="mono">{cuFmt(tax)}</span></div>
                <div className="row total"><span>Total</span><span className="mono">{cuFmt(total)}</span></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setShowCart(false)}>Add more</button>
              <div style={{ flex: 1 }} />
              <button className="btn primary lg" onClick={placeOrder} disabled={cart.length === 0 || orderingLocked} title={orderingLocked && unlockAt ? `Ordering opens at ${new Date(unlockAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}>
                {orderingLocked ? '🔒 Locked · ' : 'Place Order · '}<span className="mono" style={{ marginLeft: 6 }}>{cuFmt(total)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {modItem && (
        <ModifierModal
          item={modItem}
          onClose={() => setModItem(null)}
          onAdd={(mods, notes, qty) => { addToCart(modItem, mods, notes, qty); setModItem(null); }}
        />
      )}

      {arItem && (
        <DishXR
          item={arItem}
          onClose={() => setArItem(null)}
          onAdd={(it) => { addToCart(it, [], '', 1); showAi(`Added ${it.name}`, 'ok'); }}
        />
      )}

      {/* Floating chat launcher */}
      <button
        className={'cu-chat-fab' + (chatOpen ? ' open' : '')}
        onClick={() => setChatOpen(o => !o)}
        title="Ask Wabi Sabi"
      >
        <span style={{ fontSize: 22 }}>{chatOpen ? '✕' : '💬'}</span>
        {!chatOpen && <span className="cu-chat-fab-lbl">Concierge</span>}
      </button>

      {chatOpen && (
        <ChatPanel
          messages={chatMessages}
          busy={chatBusy}
          voice={chatVoice}
          onToggleVoice={() => setChatVoice(v => { const n = !v; if (v) cancelSpeak(); return n; })}
          onSend={sendChat}
          onClose={() => { setChatOpen(false); cancelSpeak(); }}
          onClear={() => { setChatMessages([]); cancelSpeak(); }}
        />
      )}

      {aiToast && <div className={'toast ' + (aiToast.kind || '')}>{aiToast.msg}</div>}
    </div>
  );
}

// ── Conversational chat panel ──────────────────────────────────────────────
function ChatPanel({ messages, busy, voice, onToggleVoice, onSend, onClose, onClear }) {
  const [text, setText] = React.useState('');
  const inputRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  React.useEffect(() => { inputRef.current?.focus(); }, []);
  React.useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages, busy]);

  const speech = useSpeech({});
  // When the user pauses speaking, send the transcript as a chat message
  React.useEffect(() => {
    if (!speech.listening && speech.transcript) {
      const t = speech.transcript;
      speech.reset();
      onSend(t);
    }
  }, [speech.listening, speech.transcript]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const sampleStarters = [
    'What do you recommend tonight?',
    'I want something vegetarian and warming',
    'One tonkotsu ramen, an ebi tempura, and a yuzu highball',
    "What's your most popular dish?",
  ];

  const renderContent = (c) => {
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) return c.map(b => b.type === 'text' ? b.text : '').join(' ');
    return '';
  };

  return (
    <div className="cu-chat" onClick={e => e.stopPropagation()}>
      <div className="cu-chat-head">
        <div>
          <div className="cu-chat-title akane-title">Wabi Sabi Concierge</div>
          <div className="cu-chat-sub">Ask anything · I can add to your order</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="cu-chat-icon" onClick={onToggleVoice} title={voice ? 'Voice on' : 'Voice off'}>{voice ? '🔊' : '🔇'}</button>
        {messages.length > 0 && <button className="cu-chat-icon" onClick={onClear} title="Clear chat">↺</button>}
        <button className="cu-chat-icon" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="cu-chat-body" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="cu-chat-empty">
            <div style={{ fontSize: 32 }}>👋</div>
            <div className="cu-chat-empty-title">Good evening — I'm your Wabi Sabi concierge.</div>
            <div className="cu-chat-empty-sub">Tell me what you want, or ask for ideas. Try:</div>
            <div className="cu-chat-starters">
              {sampleStarters.map(s => (
                <button key={s} onClick={() => onSend(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          // Hide internal tool-result turns
          if (m.role === 'tool') return null;
          if (m.role === 'user' && Array.isArray(m.content) && m.content[0]?.type === 'tool_result') return null;
          // Assistant turn with structured tool calls (from our shim)
          if (m.role === 'assistant' && m._toolCalls) {
            const txt = typeof m.content === 'string' ? m.content : '';
            return (
              <div key={i} className="cu-msg ai">
                {txt && <div className="cu-msg-bubble">{txt}</div>}
                {m._toolCalls.map(tc => (
                  <div key={tc.id} className="cu-msg-tool">⚙ {tc.name}({JSON.stringify(tc.args)})</div>
                ))}
              </div>
            );
          }
          // Anthropic raw content array (back-compat)
          if (m.role === 'assistant' && Array.isArray(m.content)) {
            const txt = m.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim();
            const tools = m.content.filter(b => b.type === 'tool_use');
            if (!txt && tools.length === 0) return null;
            return (
              <div key={i} className="cu-msg ai">
                {txt && <div className="cu-msg-bubble">{txt}</div>}
                {tools.map(t => (
                  <div key={t.id} className="cu-msg-tool">⚙ {t.name}({JSON.stringify(t.input)})</div>
                ))}
              </div>
            );
          }
          return (
            <div key={i} className={'cu-msg ' + (m.role === 'user' ? 'me' : 'ai')}>
              <div className="cu-msg-bubble">{renderContent(m.content)}</div>
            </div>
          );
        })}

        {busy && (
          <div className="cu-msg ai">
            <div className="cu-msg-bubble cu-msg-typing"><span /><span /><span /></div>
          </div>
        )}
      </div>

      <div className="cu-chat-foot">
        <button
          className={'cu-chat-mic' + (speech.listening ? ' on' : '')}
          onClick={() => speech.listening ? speech.stop() : speech.start()}
          disabled={!speech.supported}
          title={speech.supported ? 'Tap and speak' : 'Voice not supported'}
        >{speech.listening ? '⏹' : '🎙'}</button>
        <input
          ref={inputRef}
          placeholder="Type a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        />
        <button className="cu-chat-send" onClick={submit} disabled={!text.trim() || busy}>Send</button>
      </div>
    </div>
  );
}

// ── Customer status / live tracker ────────────────────────────────────────
function CustomerStatus({ order, onSwitchRole }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const status = order.statusOverride || order._derivedStatus || 'placed';
  const firedAt = order.firedAt || order.openedAt;
  const elapsedMs = now - firedAt;
  const ESTIMATED_MS = 15 * 60 * 1000;
  const remaining = Math.max(0, ESTIMATED_MS - elapsedMs);
  const remMin = Math.floor(remaining / 60000);
  const remSec = Math.floor((remaining % 60000) / 1000);
  const pct = Math.min(100, (elapsedMs / ESTIMATED_MS) * 100);

  const subtotal = order.lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const tax = subtotal * cuTAX;
  const total = subtotal + tax;

  const stages = [
    { id: 'placed', label: 'Order placed', ico: '✓' },
    { id: 'kitchen', label: 'In the kitchen', ico: '🔥' },
    { id: 'ready', label: 'Ready / Served', ico: '🍽' },
    { id: 'paid', label: 'Bill settled', ico: '💳' },
  ];
  const stageIdx = stages.findIndex(s => s.id === status);

  return (
    <div className="cu-status">
      <header className="cu-top">
        <div className="cu-brand akane">
          <div className="cu-logo akane-logo">{'WABI\nSABI'}</div>
          <div>
            <div className="cu-name akane-title">Wabi Sabi</div>
            <div className="cu-sub">Order #{order.id}</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn ghost" onClick={onSwitchRole} title="Switch role">⇄ Switch</button>
      </header>

      <div className="cu-status-body">
        <div className="cu-status-card">
          <div className="cu-status-hello">Thanks {order.customerName || 'there'} 👋</div>
          <div className="cu-status-eta">
            {status === 'paid' ? (
              <div>
                <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Settled</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>Thank you!</div>
              </div>
            ) : status === 'ready' ? (
              <div>
                <div style={{ fontSize: 14, color: 'var(--ok)' }}>Your food is ready</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>🍽 Enjoy!</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Estimated time</div>
                <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  ~{String(remMin).padStart(2, '0')}:{String(remSec).padStart(2, '0')}
                </div>
              </div>
            )}
          </div>

          {status !== 'paid' && status !== 'ready' && (
            <div className="cu-progress"><div className="cu-progress-fill" style={{ width: pct + '%' }} /></div>
          )}

          <div className="cu-stages">
            {stages.map((s, i) => (
              <div key={s.id} className={'cu-stage' + (i <= stageIdx ? ' done' : '') + (i === stageIdx ? ' current' : '')}>
                <div className="cu-stage-dot">{i <= stageIdx ? '✓' : i + 1}</div>
                <div className="cu-stage-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cu-bill">
          <h3>Your Bill</h3>
          <div className="cu-bill-meta">
            {order.diningMode === 'takeaway' ? '🥡 Takeaway' : (order.tableNo ? `🍽 Table ${order.tableNo}` : '🍽 Dine-in')} · Order #{order.id}
          </div>
          <div className="cu-bill-lines">
            {order.lines.map(l => (
              <div key={l.lineId} className="cu-bill-line">
                <span className="q">{l.qty}×</span>
                <span className="n">{l.name}</span>
                <span className="p mono">{cuFmt(l.unit * l.qty)}</span>
              </div>
            ))}
          </div>
          <div className="cu-bill-totals">
            <div className="row"><span>Subtotal</span><span className="mono">{cuFmt(subtotal)}</span></div>
            <div className="row"><span>GST (5%)</span><span className="mono">{cuFmt(tax)}</span></div>
            <div className="row total"><span>Total</span><span className="mono">{cuFmt(total)}</span></div>
          </div>
          {status === 'ready' && (
            <div className="cu-bill-foot">A staff member will bring it over and take payment at your table.</div>
          )}
        </div>
      </div>
    </div>
  );
}

window.RoleSelect = RoleSelect;
window.CustomerApp = CustomerApp;
window.CustomerStatus = CustomerStatus;

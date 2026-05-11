// AI integration — multi-provider (Anthropic Claude / Azure OpenAI / OpenAI).
// Speech-to-text + natural-language order parser + multi-turn chat. All AI
// callers go through callAI() so the rest of the app doesn't care which
// vendor is configured. Heuristic fallback when no provider is set.

const AI_LEGACY_KEY = 'forno-pos-anthropic-key'; // backwards compat
const AI_CFG_LS = 'forno-pos-ai-config';
const AI_DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

const loadAIConfig = () => {
  try {
    const raw = localStorage.getItem(AI_CFG_LS);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Legacy fall-through: if a bare Anthropic key was stored, migrate it.
  try {
    const legacy = localStorage.getItem(AI_LEGACY_KEY);
    if (legacy) return { provider: 'anthropic', apiKey: legacy };
  } catch {}
  return { provider: 'anthropic', apiKey: '' };
};
const saveAIConfig = (cfg) => { try { localStorage.setItem(AI_CFG_LS, JSON.stringify(cfg)); } catch {} };

window.AI = {
  getConfig: loadAIConfig,
  setConfig: saveAIConfig,
  // Backwards-compat: code that still calls AI.getKey() / setKey() keeps
  // working. Reads/writes the active provider's apiKey.
  getKey: () => loadAIConfig().apiKey || '',
  setKey: (k) => {
    const cfg = loadAIConfig();
    cfg.apiKey = k;
    saveAIConfig(cfg);
  },
};

// ── First-run key bootstrap from local-keys.json (gitignored) ──────────────
// Lets a developer drop keys into a local file once; on first browser load
// they're copied into localStorage and the file can be deleted. Fails
// silently if the file is missing (the common case in production).
// Storage keys are inlined here because the constants below are defined
// later in the file — referencing them here would hit a TDZ error.
(async function bootstrapLocalKeys() {
  const IMG_GEN_LS = 'forno-pos-image-gen-config';
  const PEX_LS = 'forno-pos-pexels-key';
  try {
    const res = await fetch('local-keys.json', { cache: 'no-store' });
    if (!res.ok) return;
    const local = await res.json();
    // Image-gen (Gemini / Nano Banana)
    if (local.nanoBanana) {
      let cur = {};
      try { cur = JSON.parse(localStorage.getItem(IMG_GEN_LS) || '{}'); } catch {}
      if (!cur.apiKey) {
        const next = {
          provider: cur.provider || 'gemini',
          model: cur.model || 'gemini-2.5-flash-image-preview',
          apiKey: local.nanoBanana,
        };
        try { localStorage.setItem(IMG_GEN_LS, JSON.stringify(next)); } catch {}
        console.info('[forno] Loaded Nano Banana key from local-keys.json');
      }
    }
    // Pexels
    if (local.pexels) {
      let cur = '';
      try { cur = localStorage.getItem(PEX_LS) || ''; } catch {}
      if (!cur) {
        try { localStorage.setItem(PEX_LS, local.pexels); } catch {}
        console.info('[forno] Loaded Pexels key from local-keys.json');
      }
    }
    // Chat AI provider (Anthropic / Azure / OpenAI)
    if (local.chat && !loadAIConfig().apiKey) {
      saveAIConfig(local.chat);
      console.info('[forno] Loaded chat AI config from local-keys.json');
    }
  } catch {
    // file missing — that's fine in production
  }
})();

// ── Menu-vocabulary autocorrect ─────────────────────────────────────────────
// Even with a good STT model, Indian-accented English + Japanese culinary
// terms produce systematic mishearings ("march" → "matcha", "tongue coats"
// → "tonkotsu"). Two-pass correction: (1) exact direct mappings of the most
// common confusions, (2) token-level edit-distance fallback against the menu
// lexicon. Applied to every transcript regardless of which STT backend ran.

const MENU_VOCAB = [
  // Japanese dish / ingredient terms a guest might say
  'matcha','tonkotsu','omakase','edamame','hamachi','takoyaki','wagyu','tataki',
  'ikura','agedashi','tofu','chawanmushi','otoro','chirashi','sukiyaki','unagi',
  'saikyo','ebi','tempura','katsu','teriyaki','yakitori','mochi','anmitsu',
  'kuromitsu','brulee','hibiki','junmai','daiginjo','sake','yuzu','sakura',
  'mojito','hojicha','genmaicha','asahi','sapporo','ramune','dashi','ajitama',
  'nori','shiso','sashimi','nigiri','tartare','highball','cheesecake','tiramisu',
  'ponzu','kewpie','sansho','miso','ramen','don','bowl','platter',
];

// Direct mishearing → correct map. Whole-word, case-insensitive. Order
// matters only for multi-word entries (longer ones first via length sort).
const MENU_MISHEAR_MAP = {
  // matcha
  'march': 'matcha', 'marcha': 'matcha', 'marsha': 'matcha', 'matter': 'matcha',
  'marcia': 'matcha', 'matchya': 'matcha', 'macha': 'matcha',
  // tonkotsu
  'tongue coats': 'tonkotsu', 'ton coats': 'tonkotsu', 'tom coats': 'tonkotsu',
  'tongue kotsu': 'tonkotsu', 'tonkostu': 'tonkotsu', 'tom kotsu': 'tonkotsu',
  'donkatsu': 'tonkotsu', 'tonk hotsu': 'tonkotsu',
  // omakase
  'oma case': 'omakase', 'om kase': 'omakase', 'omikase': 'omakase',
  'oh ma kase': 'omakase',
  // edamame
  'edam ami': 'edamame', 'edamamy': 'edamame', 'edam amy': 'edamame',
  'idamame': 'edamame',
  // hamachi
  'ham archy': 'hamachi', 'hammachi': 'hamachi', 'ham archi': 'hamachi',
  // takoyaki
  'taco yaki': 'takoyaki', 'taka yaki': 'takoyaki', 'tako yucky': 'takoyaki',
  // wagyu / tataki
  'wagu': 'wagyu', 'waghu': 'wagyu', 'wagyou': 'wagyu',
  'tata key': 'tataki', 'tataaki': 'tataki',
  // ikura / agedashi / chawanmushi
  'icra': 'ikura', 'ikra': 'ikura', 'i cura': 'ikura',
  'aged ashi': 'agedashi', 'agedaashi': 'agedashi',
  'chawan moosi': 'chawanmushi', 'chavan mushi': 'chawanmushi',
  // otoro / chirashi / sukiyaki
  'oh toro': 'otoro', 'otorro': 'otoro',
  'chee rashi': 'chirashi', 'cheerashi': 'chirashi',
  'sukey yaki': 'sukiyaki', 'suki yucky': 'sukiyaki',
  // unagi / saikyo / katsu / teriyaki
  'oonagi': 'unagi', 'unaghi': 'unagi', 'u nagi': 'unagi',
  'saicho': 'saikyo', 'saiko': 'saikyo', 'sai cho': 'saikyo',
  'kotsu': 'katsu', 'cuts': 'katsu', 'kuts': 'katsu',
  'teri yucky': 'teriyaki', 'terry yucky': 'teriyaki',
  // yakitori / mochi / anmitsu / brulee
  'yaki tory': 'yakitori', 'yaki tori': 'yakitori',
  'mochee': 'mochi', 'mocky': 'mochi',
  'an mitsu': 'anmitsu', 'anmitzu': 'anmitsu',
  'bro lay': 'brûlée', 'brulay': 'brûlée', 'broolay': 'brûlée',
  // sake / yuzu / sakura / hojicha / genmaicha
  'saa key': 'sake', 'sakey': 'sake',
  'you zoo': 'yuzu', 'youzu': 'yuzu', 'use zoo': 'yuzu',
  'sakoora': 'sakura', 'sak oora': 'sakura',
  'hodgi cha': 'hojicha', 'hodge eecha': 'hojicha', 'hodjicha': 'hojicha',
  'gen my cha': 'genmaicha', 'gen mai cha': 'genmaicha', 'gen ma cha': 'genmaicha',
  // brands often misheard
  'a sahi': 'asahi', 'asaahi': 'asahi',
  'sapora': 'sapporo', 'sappora': 'sapporo',
  'ramoonay': 'ramune', 'ra mooney': 'ramune',
  'hi beaky': 'hibiki', 'hib eki': 'hibiki',
  'jun my': 'junmai', 'jun maai': 'junmai',
  'daigingo': 'daiginjo', 'die gingo': 'daiginjo',
  // generic
  'pun zoo': 'ponzu', 'kew pee': 'kewpie',
};

function _editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

function applyMenuAutocorrect(text) {
  if (!text) return text;
  let out = text;
  // Pass 1: direct mishearing map (longest phrases first so multi-word
  // entries beat single-word substrings of themselves).
  const entries = Object.entries(MENU_MISHEAR_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [wrong, right] of entries) {
    const esc = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + esc + '\\b', 'gi');
    out = out.replace(re, right);
  }
  // Pass 2: token-level edit-distance to the menu lexicon. Only kicks in for
  // 4+-letter alphabetic tokens that aren't already an exact menu term.
  // Tight threshold (≤2 edits AND length-similar) so we don't mangle normal
  // English. Replacement preserves the original word's capitalization.
  return out.replace(/[A-Za-z]+/g, (word) => {
    if (word.length < 4) return word;
    const lc = word.toLowerCase();
    if (MENU_VOCAB.includes(lc)) return word;
    let best = null, bestDist = 99;
    for (const v of MENU_VOCAB) {
      if (Math.abs(v.length - lc.length) > 2) continue;
      const d = _editDistance(lc, v);
      if (d < bestDist) { bestDist = d; best = v; }
    }
    const maxAllowed = Math.min(2, Math.floor(lc.length / 3));
    if (best && bestDist > 0 && bestDist <= maxAllowed) {
      // Preserve initial capitalization
      return /^[A-Z]/.test(word) ? best.charAt(0).toUpperCase() + best.slice(1) : best;
    }
    return word;
  });
}

// Builds the bias prompt sent to Azure transcribe — gives the model menu
// vocabulary up front so it favors "matcha" over "march", etc.
function buildMenuPrompt() {
  const M = window.POS_DATA && window.POS_DATA.MENU;
  const names = (M || []).map(m => m.name).filter(Boolean);
  const vocab = [...new Set([...names, ...MENU_VOCAB])].join(', ');
  return `Japanese restaurant order. Menu includes: ${vocab}. Indian-accented English is expected.`;
}

// ── Speech-to-text hook ─────────────────────────────────────────────────────
// Two backends behind one interface:
//   • Azure gpt-4o-transcribe — used when an Azure provider + key + endpoint
//     + transcribeDeployment are all configured. Records via MediaRecorder,
//     sends the blob with menu vocabulary as a bias prompt, applies menu
//     autocorrect to the final transcript. Better for Indian accents and
//     Japanese terms than the browser API.
//   • Browser Web Speech API — fallback. Still pinned to en-IN locale and
//     post-processed through the same menu autocorrect.
function useSpeech({ onFinal } = {}) {
  const [supported] = React.useState(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) return true;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  });
  const [listening, setListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [interim, setInterim] = React.useState('');
  const [error, setError] = React.useState(null);
  const recRef = React.useRef(null);          // browser SpeechRecognition
  const recorderRef = React.useRef(null);     // MediaRecorder
  const streamRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const onFinalRef = React.useRef(onFinal);
  onFinalRef.current = onFinal;

  const azureReady = () => {
    const c = loadAIConfig();
    return c.provider === 'azure' && c.apiKey && c.endpoint && c.transcribeDeployment;
  };

  const startAzure = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setError('recorder not supported');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    recorder.onerror = () => { setError('recording error'); setListening(false); cleanupStream(); };
    recorder.onstop = async () => {
      setListening(false);
      setInterim('');
      cleanupStream();
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size < 1200) return; // ignore <~0.1s clips
      try {
        const raw = await azureTranscribe(blob, { language: 'en', prompt: buildMenuPrompt() });
        const corrected = applyMenuAutocorrect(raw.trim());
        if (corrected) {
          setTranscript(corrected);
          onFinalRef.current && onFinalRef.current(corrected);
        }
      } catch (err) {
        setError(err.message || 'transcribe error');
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setListening(true);
    setInterim('Listening…');
  };

  const cleanupStream = () => {
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    streamRef.current = null;
  };

  const start = React.useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterim('');
    // Prefer Azure if it's configured — better for Indian-English + Japanese terms.
    if (azureReady()) {
      try { await startAzure(); return; }
      catch (e) {
        setError(e.message || 'mic permission denied');
        setListening(false);
        cleanupStream();
        return;
      }
    }
    // Fallback: browser Web Speech API.
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('speech not supported'); return; }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e) => { setError(e.error || 'speech error'); setListening(false); };
    rec.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) {
        const corrected = applyMenuAutocorrect(finalText.trim());
        setTranscript(t => (t ? t + ' ' : '') + corrected);
        setInterim('');
        onFinalRef.current && onFinalRef.current(corrected);
      } else {
        setInterim(interimText);
      }
    };
    recRef.current = rec;
    try { rec.start(); } catch (e) { setError(String(e.message || e)); }
  }, []);

  const stop = React.useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    try {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
    } catch {}
  }, []);

  const reset = React.useCallback(() => {
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  React.useEffect(() => () => {
    try { recRef.current?.abort(); } catch {}
    try { recorderRef.current?.stop(); } catch {}
    cleanupStream();
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}

// ── Heuristic fallback parser ───────────────────────────────────────────────
// Scans the whole transcript for menu-item name occurrences (longest first
// so multi-word names match before substrings), then attaches the nearest
// preceding quantity. Same-id matches are summed, not dropped — so "two
// paneer tikka and three paneer tikka" → 5. Handles plurals, "&" / "and",
// and parenthetical suffixes like "(2pc)".
const NUM_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, couple: 2, pair: 2, dozen: 12,
};

// Generic words that should NOT be treated as standalone aliases (too ambiguous
// or too generic — e.g. "rice", "bowl", "soda" appear across many dishes).
const ALIAS_STOPWORDS = new Set([
  'the','and','with','plus','also','then','that','this','some',
  'set','plate','platter','bowl','soda','salt','rice','pot','tea','beer',
  'red','black','white','green','spicy','mild','sweet','iced','hot','cold',
  'super','dry','premium','blend','select','classic','original','steamed',
  'grilled','glazed','marinated','charred','roasted','fried','baked','served',
  'over','crisp','crispy','soft','warm','chilled','course','cream','butter',
  'sugar','milk','water','flake','flakes','small','large','full','half',
  'piece','pieces','side','sides','bottle','glass','cup','order',
]);

// Hand-curated synonyms — common casual terms a guest might say that aren't
// in the dish names verbatim. Map English / casual phrasing → menu item id.
// These are added as aliases when the target item exists in the menu.
const SYNONYM_MAP = [
  // Sushi family
  ['sushi',          'sh01'],
  ['nigiri',         'sh01'],
  ['omakase',        'sh01'],
  ['tuna belly',     'sh01'],
  ['sashimi',        'za02'],
  // Mains
  ['ramen',          'sh06'],   // ambiguous — default to popular Tonkotsu
  ['noodles',        'sh06'],
  ['eel',            'sh04'],
  ['eel rice',       'sh04'],
  ['cod',            'sh05'],
  ['miso cod',       'sh05'],
  ['salmon',         'sh10'],
  ['teriyaki',       'sh10'],
  ['katsu',          'sh09'],
  ['curry',          'sh09'],
  ['tempura',        'sh08'],
  ['prawns',         'sh08'],
  ['shrimp',         'sh08'],
  ['skewers',        'sh11'],
  // Desserts
  ['tiramisu',       'km01'],
  ['cheesecake',     'km03'],
  ['anmitsu',        'km04'],
  ['brulee',         'km05'],
  ['creme brulee',   'km05'],
  // Drinks
  ['whisky',         'nm01'],
  ['whiskey',        'nm01'],
  ['hibiki',         'nm01'],
  ['sake',           'nm02'],
  ['highball',       'nm03'],
  ['mojito',         'nm04'],
  ['matcha latte',   'nm05'],
  ['hojicha',        'nm06'],
  ['genmaicha',      'nm07'],
  ['asahi',          'nm08'],
  ['beer',           'nm08'],   // default to most popular
  ['sapporo',        'nm09'],
  ['ramune',         'nm10'],
  // Starters
  ['edamame',        'za01'],
  ['hamachi',        'za02'],
  ['yellowtail',     'za02'],
  ['crudo',          'za02'],
  ['takoyaki',       'za03'],
  ['octopus',        'za03'],
  // 'wagyu' deliberately omitted — it appears in both Wagyu Tataki (starter)
  // and A5 Wagyu Sukiyaki (main); a guest must say the full dish name.
  ['tataki',         'za04'],
  ['ikura',          'za05'],
  ['tartare',        'za05'],
  ['agedashi',       'za06'],
  ['tofu',           'za06'],
  ['chawanmushi',    'za07'],
];

function parseOrderHeuristic(text, menu) {
  if (!text || !text.trim()) return [];
  // Normalize: lowercase, '&' → 'and', strip punctuation, collapse whitespace.
  const norm = ' ' + text.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim() + ' ';

  // ── Pass 1: full cleaned names + "no-and" variants ────────────────────────
  // So e.g. "Old Monk & Coke" matches "old monk and coke" AND "old monk coke".
  const aliases = [];
  const seen = new Set(); // dedup (alias, itemId)
  const addAlias = (item, alias) => {
    if (!alias) return;
    const key = item.id + '|' + alias;
    if (seen.has(key)) return;
    seen.add(key);
    aliases.push({ item, alias });
  };
  for (const item of menu) {
    const clean = item.name.toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    addAlias(item, clean);
    const stripped = clean.replace(/\band\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (stripped && stripped !== clean) addAlias(item, stripped);
  }

  // ── Pass 2: hand-curated synonyms (casual phrasings) ─────────────────────
  for (const [phrase, id] of SYNONYM_MAP) {
    const item = menu.find(m => m.id === id);
    if (item) addAlias(item, phrase);
  }

  // ── Pass 3: unique-token aliases ─────────────────────────────────────────
  // Any 4+-char token that appears in exactly one menu name (across the whole
  // menu) becomes a standalone alias for that item. Catches e.g. "tonkotsu",
  // "yakitori", "mochi", "kuromitsu" without us having to enumerate them.
  const tokenIndex = new Map(); // token → Set<itemId>
  for (const item of menu) {
    const tokens = item.name.toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 4 && !ALIAS_STOPWORDS.has(t) && !/^\d+$/.test(t));
    for (const t of new Set(tokens)) {
      if (!tokenIndex.has(t)) tokenIndex.set(t, new Set());
      tokenIndex.get(t).add(item.id);
    }
  }
  for (const [token, itemIds] of tokenIndex) {
    if (itemIds.size !== 1) continue;
    const item = menu.find(m => m.id === [...itemIds][0]);
    if (item) addAlias(item, token);
  }

  // Longest first so "Tonkotsu Ramen" wins over "Tonkotsu" etc.
  aliases.sort((a, b) => b.alias.length - a.alias.length);

  // Find non-overlapping name occurrences across the full transcript.
  // Optional trailing 's' covers casual plurals ("two naans").
  const occupied = new Array(norm.length).fill(false);
  const found = [];
  for (const { item, alias } of aliases) {
    const pat = new RegExp('\\b' + alias.replace(/ /g, '\\s+') + 's?\\b', 'g');
    let m;
    while ((m = pat.exec(norm)) !== null) {
      const s = m.index, e = s + m[0].length;
      let overlap = false;
      for (let i = s; i < e; i++) if (occupied[i]) { overlap = true; break; }
      if (overlap) continue;
      for (let i = s; i < e; i++) occupied[i] = true;
      found.push({ start: s, end: e, item });
    }
  }
  found.sort((a, b) => a.start - b.start);

  // Collapse adjacent same-item alias hits into a single mention. E.g. for
  // "chicken katsu" both single-word aliases "chicken" and "katsu" resolve
  // to Chicken Katsu Curry — but the user said it once, not twice. If the
  // gap between two same-item matches is whitespace only, treat as one.
  {
    const collapsed = [];
    for (const f of found) {
      const last = collapsed[collapsed.length - 1];
      if (last && last.item.id === f.item.id && /^\s*$/.test(norm.slice(last.end, f.start))) {
        last.end = f.end;
        continue;
      }
      collapsed.push({ ...f });
    }
    found.length = 0;
    found.push(...collapsed);
  }

  // For each match, pull the last number (digit or word) in the gap between
  // the previous match and this one. Bounding the search prevents an early
  // quantity from being stolen by a later item.
  const NUM_REGEX = /(\d+)|\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|couple|pair|dozen)\b/gi;
  const out = [];
  for (let i = 0; i < found.length; i++) {
    const cur = found[i];
    const winStart = i === 0 ? 0 : found[i - 1].end;
    const win = norm.slice(winStart, cur.start);
    let qty = 1;
    const tokens = [...win.matchAll(NUM_REGEX)];
    if (tokens.length) {
      const last = tokens[tokens.length - 1];
      if (last[1]) qty = Math.min(20, parseInt(last[1], 10) || 1);
      else if (last[2]) qty = NUM_WORDS[last[2].toLowerCase()] || 1;
    }
    out.push({ itemId: cur.item.id, qty, source: 'heuristic' });
  }

  // Merge same-id matches by summing qty (capped at 20 per line).
  const merged = [];
  for (const m of out) {
    const existing = merged.find(x => x.itemId === m.itemId);
    if (existing) existing.qty = Math.min(20, existing.qty + m.qty);
    else merged.push(m);
  }
  return merged;
}

// ── Unified callAI dispatcher ───────────────────────────────────────────────
// Same shape regardless of provider. Returns { text, toolCalls, raw }.
// `messages` follows OpenAI-style: [{role, content}, ...]. We translate
// internally for Anthropic. `tools` is optional OpenAI-style; converted for
// Anthropic. `json` requests JSON-only output.
async function callAI({ messages, system, tools, json, signal, maxTokens }) {
  const cfg = loadAIConfig();
  const provider = cfg.provider || 'anthropic';
  if (!cfg.apiKey) throw new Error('no key');
  if (provider === 'anthropic') return callAnthropic({ cfg, messages, system, tools, json, signal, maxTokens });
  if (provider === 'azure') return callAzureOpenAI({ cfg, messages, system, tools, json, signal, maxTokens });
  if (provider === 'openai') return callOpenAI({ cfg, messages, system, tools, json, signal, maxTokens });
  throw new Error('unknown provider: ' + provider);
}

async function callAnthropic({ cfg, messages, system, tools, json, signal, maxTokens }) {
  // Translate OpenAI-style messages to Anthropic.
  const anthMessages = messages.filter(m => m.role !== 'system').map(m => {
    if (m.role === 'tool') {
      // Anthropic expects tool_result inside a user message
      return { role: 'user', content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }] };
    }
    return { role: m.role, content: m.content };
  });
  const sysParts = [];
  if (system) sysParts.push(system);
  messages.filter(m => m.role === 'system').forEach(m => sysParts.push(typeof m.content === 'string' ? m.content : ''));
  let combinedSys = sysParts.filter(Boolean).join('\n\n');
  if (json) combinedSys += '\n\nRespond ONLY with strict JSON. No prose, no code fences.';

  const body = {
    model: cfg.model || AI_DEFAULT_ANTHROPIC_MODEL,
    max_tokens: maxTokens || 800,
    system: combinedSys || undefined,
    messages: anthMessages,
  };
  if (tools && tools.length) {
    body.tools = tools.map(t => ({
      name: t.function?.name || t.name,
      description: t.function?.description || t.description,
      input_schema: t.function?.parameters || t.input_schema,
    }));
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 240)}`);
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join(' ').trim();
  const toolCalls = (data.content || []).filter(b => b.type === 'tool_use').map(b => ({
    id: b.id, name: b.name, args: b.input,
  }));
  return { text, toolCalls, raw: data };
}

async function callAzureOpenAI({ cfg, messages, system, tools, json, signal, maxTokens }) {
  if (!cfg.endpoint) throw new Error('Azure endpoint not configured');
  if (!cfg.deployment) throw new Error('Azure deployment name not configured');
  // Build messages: prepend system (or developer for new GPT-5/o1-style models)
  const sysRole = (cfg.deployment || '').match(/(gpt-5|o1|o3|o4)/i) ? 'developer' : 'system';
  const oaiMessages = [];
  if (system) oaiMessages.push({ role: sysRole, content: system });
  for (const m of messages) {
    if (m.role === 'system') oaiMessages.push({ role: sysRole, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) });
    else oaiMessages.push(m);
  }
  const base = (cfg.endpoint || '').replace(/\/+$/, '');
  // The new Azure v1 endpoint exposes /chat/completions directly.
  const url = base + '/chat/completions';
  const body = {
    model: cfg.deployment,
    messages: oaiMessages,
    max_completion_tokens: maxTokens || 800,
  };
  if (tools && tools.length) body.tools = tools;
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(url, {
    method: 'POST', signal,
    headers: {
      'content-type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey,
      'api-key': cfg.apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Azure ${res.status}: ${(await res.text().catch(() => '')).slice(0, 240)}`);
  const data = await res.json();
  const choice = (data.choices && data.choices[0]) || {};
  const msg = choice.message || {};
  const text = msg.content || '';
  const toolCalls = (msg.tool_calls || []).map(tc => ({
    id: tc.id,
    name: tc.function?.name,
    args: tc.function?.arguments ? safeJSON(tc.function.arguments) : {},
  }));
  return { text, toolCalls, raw: data };
}

async function callOpenAI({ cfg, messages, system, tools, json, signal, maxTokens }) {
  const oaiMessages = [];
  if (system) oaiMessages.push({ role: 'system', content: system });
  for (const m of messages) oaiMessages.push(m);
  const body = {
    model: cfg.model || 'gpt-4o-mini',
    messages: oaiMessages,
    max_tokens: maxTokens || 800,
  };
  if (tools && tools.length) body.tools = tools;
  if (json) body.response_format = { type: 'json_object' };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text().catch(() => '')).slice(0, 240)}`);
  const data = await res.json();
  const choice = (data.choices && data.choices[0]) || {};
  const msg = choice.message || {};
  const text = msg.content || '';
  const toolCalls = (msg.tool_calls || []).map(tc => ({
    id: tc.id,
    name: tc.function?.name,
    args: tc.function?.arguments ? safeJSON(tc.function.arguments) : {},
  }));
  return { text, toolCalls, raw: data };
}

function safeJSON(s) { try { return JSON.parse(s); } catch { return {}; } }

// ── Order parser using callAI ───────────────────────────────────────────────
async function parseOrderWithAI(text, menu) {
  const compactMenu = menu.map(m => ({ id: m.id, name: m.name, cat: m.cat, price: m.price })).slice(0, 200);
  const sys = 'You parse restaurant orders from natural language (English, Hinglish, or transliterated Hindi). Match every item the customer mentions to an exact id from the provided menu. If a request is ambiguous, pick the closest available item. If a request has no plausible menu match, omit it. Return strict JSON: {"items":[{"itemId":"<id>","qty":<int>,"note":"<optional>"}],"missing":["<phrase>"]}.';
  const user = `Menu (id, name, category, price ₹):\n${JSON.stringify(compactMenu)}\n\nCustomer said: "${text}"`;
  const r = await callAI({ messages: [{ role: 'user', content: user }], system: sys, json: true, maxTokens: 800 });
  const raw = (r.text || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('bad AI response'); }
  return {
    items: (parsed.items || []).map(x => ({ itemId: x.itemId, qty: Math.max(1, parseInt(x.qty, 10) || 1), note: x.note || '', source: 'ai' })),
    missing: parsed.missing || [],
  };
}

// Public: try AI first, fall back to heuristic. Menu autocorrect is applied
// before either path runs, so typing "march latte" or saying "tongue coats"
// is normalised to "matcha latte" / "tonkotsu" upstream.
async function parseOrder(text, menu) {
  const corrected = applyMenuAutocorrect(text || '');
  const cfg = loadAIConfig();
  if (cfg.apiKey) {
    try {
      const r = await parseOrderWithAI(corrected, menu);
      return { items: r.items, missing: r.missing, mode: 'ai', corrected };
    } catch (e) {
      console.warn('AI parse failed, falling back:', e.message);
      return { items: parseOrderHeuristic(corrected, menu), missing: [], mode: 'heuristic', corrected, error: e.message };
    }
  }
  return { items: parseOrderHeuristic(corrected, menu), missing: [], mode: 'heuristic', corrected };
}

// ── Text-to-speech ─────────────────────────────────────────────────────────
// Routes through Azure gpt-4o-mini-tts when an Azure provider with a TTS
// deployment is configured; otherwise uses the browser SpeechSynthesis API.
let _azureAudioEl = null;
async function azureTTS(text, opts = {}) {
  const cfg = loadAIConfig();
  if (cfg.provider !== 'azure' || !cfg.apiKey || !cfg.endpoint || !cfg.ttsDeployment) {
    throw new Error('Azure TTS not configured');
  }
  const base = (cfg.endpoint || '').replace(/\/+$/, '');
  const res = await fetch(base + '/audio/speech', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey,
      'api-key': cfg.apiKey,
    },
    body: JSON.stringify({
      model: cfg.ttsDeployment,
      voice: opts.voice || 'alloy',
      input: text,
      instructions: opts.instructions || 'Speak in a calm, refined, restrained tone — Wabi Sabi hospitality.',
    }),
  });
  if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${(await res.text().catch(() => '')).slice(0, 240)}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (_azureAudioEl) { try { _azureAudioEl.pause(); } catch {} }
  const audio = new Audio(url);
  _azureAudioEl = audio;
  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
  await audio.play();
}

function speakBrowser(text, opts = {}) {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate || 1.05;
    u.pitch = opts.pitch || 1.0;
    u.lang = opts.lang || 'en-IN';
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /en-IN|Rishi|Veena|Samantha|Google US/i.test(v.name + v.lang));
    if (preferred) u.voice = preferred;
    window.speechSynthesis.speak(u);
  } catch {}
}

function speak(text, opts = {}) {
  const cfg = loadAIConfig();
  if (cfg.provider === 'azure' && cfg.apiKey && cfg.endpoint && cfg.ttsDeployment) {
    azureTTS(text, opts).catch(e => {
      console.warn('Azure TTS failed, falling back to browser:', e.message);
      speakBrowser(text, opts);
    });
    return;
  }
  speakBrowser(text, opts);
}
function cancelSpeak() {
  try { window.speechSynthesis?.cancel(); } catch {}
  try { _azureAudioEl?.pause(); } catch {}
}

// ── Speech-to-text via Azure gpt-4o-transcribe ─────────────────────────────
// Takes a recorded audio Blob (from MediaRecorder) and returns the transcript.
// Use this where you want higher accuracy than the browser Web Speech API
// (e.g. Japanese dish names, Indian-accented English). Caller handles
// recording; this just sends the blob.
async function azureTranscribe(audioBlob, { language, prompt, signal } = {}) {
  const cfg = loadAIConfig();
  if (cfg.provider !== 'azure' || !cfg.apiKey || !cfg.endpoint || !cfg.transcribeDeployment) {
    throw new Error('Azure transcribe not configured');
  }
  const base = (cfg.endpoint || '').replace(/\/+$/, '');
  const form = new FormData();
  form.append('file', audioBlob, 'audio.webm');
  form.append('model', cfg.transcribeDeployment);
  if (language) form.append('language', language);
  if (prompt) form.append('prompt', prompt);
  const res = await fetch(base + '/audio/transcriptions', {
    method: 'POST', signal,
    headers: { 'Authorization': 'Bearer ' + cfg.apiKey, 'api-key': cfg.apiKey },
    body: form,
  });
  if (!res.ok) throw new Error(`Azure transcribe ${res.status}: ${(await res.text().catch(() => '')).slice(0, 240)}`);
  const data = await res.json();
  return data.text || '';
}

// ── Conversational chat (multi-turn with tool-calling) ──────────────────────
// Provider-agnostic; uses callAI(). Returns { text, toolCalls } so the
// customer chat panel can resolve add_to_cart calls and recur.
async function chatWithAI({ messages, menu, signal }) {
  const compactMenu = menu.map(m => ({ id: m.id, name: m.name, cat: m.cat, price: m.price, popular: !!m.popular })).slice(0, 200);
  const sys = `You are the Wabi Sabi concierge — the AI host for Wabi Sabi, a Japanese fine-dining restaurant at The Oberoi, Bangalore. You help guests discover and order food.

You can call this tool:
- add_to_cart(itemId, qty, note?) — adds a menu item to the guest's order. Call it whenever the guest asks for items.

GUIDELINES:
- Be warm, refined, and concise. Replies will be spoken aloud. 1-2 sentences max.
- Match items to the menu IDs only. Never invent items.
- If the guest asks for something not on the menu, suggest the closest match in plain text.
- Confirm additions naturally: "Done — two tonkotsu ramens added."
- For dietary requests (veg, no shellfish, no spice), filter and suggest.
- Use Japanese culinary terms when natural (omakase, dashi, atsukan, ajitama).
- If unclear, ask one short question.
- Always end with a brief next-step prompt (e.g. "Anything else for you?").

Menu (id, name, category, price ₹):
${JSON.stringify(compactMenu)}`;

  const tools = [{
    type: 'function',
    function: {
      name: 'add_to_cart',
      description: "Add an item from the menu to the customer's cart.",
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'Exact id from the menu list' },
          qty: { type: 'integer', minimum: 1 },
          note: { type: 'string', description: 'Optional spice level / modifier note' },
        },
        required: ['itemId'],
      },
    },
  }];

  return callAI({ messages, system: sys, tools, signal, maxTokens: 600 });
}

// ── Image generation: Gemini 2.5 Flash Image ("Nano Banana") ───────────────
// Generates alternate angle variants of a dish from a single source photo.
// The same model maintains subject identity across outputs, which makes the
// generated frames feel like the *same* dish rotated, not random variants.

const NANO_BANANA_LS = 'forno-pos-image-gen-config';
const NANO_BANANA_DEFAULT_MODEL = 'gemini-2.5-flash-image-preview';

const loadImgGenConfig = () => {
  try {
    const raw = localStorage.getItem(NANO_BANANA_LS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: 'gemini', apiKey: '', model: NANO_BANANA_DEFAULT_MODEL };
};
const saveImgGenConfig = (cfg) => { try { localStorage.setItem(NANO_BANANA_LS, JSON.stringify(cfg)); } catch {} };

window.AI.getImgGenConfig = loadImgGenConfig;
window.AI.setImgGenConfig = saveImgGenConfig;

// Convert a URL or data: URI into a base64 + mime tuple suitable for the
// Gemini inline_data API. Fetches via the browser, falling back to a
// CORS-friendly fetch with no special options.
async function imageToBase64({ url }) {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`couldn't load image (${res.status})`);
  const blob = await res.blob();
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      const dataUrl = reader.result;
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return reject(new Error('bad image data'));
      resolve({ mimeType: m[1] || 'image/jpeg', data: m[2] });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Default 7 angle prompts — covers a 360° walk-around in 45° steps starting
// from the source photo's implied "front" view. Tuned for plated food.
const ANGLE_PROMPTS = [
  '45° rotation to the right — same dish, same plate, same garnish, same lighting, same composition. Slight side perspective. Photorealistic, restaurant photography, isolated centered.',
  '90° to the right (full side profile) — same dish, same plate, same garnish, same lighting. Photorealistic, restaurant photography.',
  '135° rotation — three-quarter view from behind-right — same dish, same plate, same garnish, same lighting. Photorealistic.',
  '180° rotation (back view) — same dish, same plate, same garnish, same lighting. Photorealistic, restaurant photography.',
  '225° rotation — three-quarter view from behind-left — same dish, same plate, same garnish, same lighting. Photorealistic.',
  '270° rotation (full side profile, left) — same dish, same plate, same garnish, same lighting. Photorealistic.',
  '315° rotation — three-quarter view from front-left — same dish, same plate, same garnish, same lighting. Photorealistic.',
];

async function nanoBananaGenerate({ sourceImageUrl, prompt, dishName, signal }) {
  const cfg = loadImgGenConfig();
  if (!cfg.apiKey) throw new Error('Image-gen API key not set');
  const model = cfg.model || NANO_BANANA_DEFAULT_MODEL;
  const { mimeType, data } = await imageToBase64({ url: sourceImageUrl });
  const fullPrompt = `Generate an alternate camera angle of this exact dish (${dishName}). ${prompt} Keep the dish's identity, plate shape, color, garnishes, and surface unchanged. Studio quality, no text, no watermark.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: fullPrompt },
          { inline_data: { mime_type: mimeType, data } },
        ],
      }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 240)}`);
  }
  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inline_data || p.inlineData);
  const inline = imgPart?.inline_data || imgPart?.inlineData;
  if (!inline) {
    const blocked = json.promptFeedback?.blockReason || '';
    throw new Error(blocked ? `blocked: ${blocked}` : 'no image returned');
  }
  return `data:${inline.mime_type || inline.mimeType};base64,${inline.data}`;
}

// ── Pexels image search ─────────────────────────────────────────────────────
// Free API (https://www.pexels.com/api/) — 200 req/hour, 20K/month. Returns
// direct image URLs we can drop into the image manager. Used by the
// "Auto-fetch from Pexels" button to seed source photos for every dish.

const PEXELS_LS = 'forno-pos-pexels-key';
const getPexelsKey = () => { try { return localStorage.getItem(PEXELS_LS) || ''; } catch { return ''; } };
const setPexelsKey = (k) => { try { k ? localStorage.setItem(PEXELS_LS, k) : localStorage.removeItem(PEXELS_LS); } catch {} };
window.AI.getPexelsKey = getPexelsKey;
window.AI.setPexelsKey = setPexelsKey;

async function searchPexels({ query, count = 1, signal }) {
  const key = getPexelsKey();
  if (!key) throw new Error('Pexels API key not set');
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.max(1, Math.min(15, count))}&orientation=square`;
  const res = await fetch(url, { signal, headers: { Authorization: key } });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Pexels ${res.status}: ${t.slice(0, 240)}`);
  }
  const json = await res.json();
  const photos = (json.photos || []).map(p => p.src?.large2x || p.src?.large || p.src?.original).filter(Boolean);
  return photos;
}

// Convenience: search by dish name with a couple of useful fallbacks.
async function fetchDishPhotosFromPexels({ dishName, count = 1, signal }) {
  // Try the dish name + "indian food" first — anchors the food domain so we
  // don't get unrelated matches (e.g. "kingfisher" → bird photos).
  const queries = [`${dishName} indian food`, dishName];
  for (const q of queries) {
    try {
      const r = await searchPexels({ query: q, count, signal });
      if (r.length > 0) return r;
    } catch (e) {
      // Surface auth errors immediately; for "no results" keep trying.
      if (/401|403/.test(e.message)) throw e;
    }
  }
  return [];
}

// ── Wikipedia / Wikimedia (no key, CORS-friendly) ───────────────────────────
// Uses the OpenSearch endpoint to find a likely article title for the dish
// name, then the REST page-summary endpoint to extract the article's lead
// image URL. Indian food has strong Wikipedia coverage so this hits ~70-80%
// of a typical Indian menu without any signup.
async function fetchDishPhotoFromWikipedia({ dishName, signal }) {
  // First try: opensearch picks the closest article title
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(dishName)}&limit=1&format=json&origin=*`;
  let title;
  try {
    const sRes = await fetch(searchUrl, { signal });
    if (sRes.ok) {
      const arr = await sRes.json();
      title = arr?.[1]?.[0];
    }
  } catch (e) {
    if (e.name === 'AbortError') throw e;
  }
  if (!title) return null;

  // Fetch the page summary, which exposes originalimage / thumbnail
  const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  try {
    const r = await fetch(sumUrl, { signal });
    if (!r.ok) return null;
    const data = await r.json();
    return data.originalimage?.source || data.thumbnail?.source || null;
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    return null;
  }
}

// Auto-router: prefers Pexels (better photos) when a key is set, else falls
// back to Wikipedia (keyless). Returns { url, source }.
async function autoFetchDishPhoto({ dishName, signal }) {
  const havePexels = !!getPexelsKey();
  if (havePexels) {
    try {
      const r = await fetchDishPhotosFromPexels({ dishName, count: 1, signal });
      if (r[0]) return { url: r[0], source: 'pexels' };
    } catch (e) {
      // Fall through to Wikipedia on Pexels failure
      if (e.name === 'AbortError') throw e;
      console.warn('Pexels failed, falling back to Wikipedia:', e.message);
    }
  }
  const wiki = await fetchDishPhotoFromWikipedia({ dishName, signal });
  if (wiki) return { url: wiki, source: 'wikipedia' };
  return null;
}

// Generate `count` (default 7) alternate angle variants for a dish.
// Yields each frame via onProgress as it's produced, so the UI can
// progressively fill slots and feel responsive.
async function generateAngleVariants({ sourceImageUrl, dishName, count = 7, onProgress, signal }) {
  const prompts = ANGLE_PROMPTS.slice(0, count);
  const out = [];
  for (let i = 0; i < prompts.length; i++) {
    if (signal?.aborted) break;
    try {
      const dataUrl = await nanoBananaGenerate({ sourceImageUrl, prompt: prompts[i], dishName, signal });
      out.push(dataUrl);
      onProgress && onProgress({ index: i, total: prompts.length, dataUrl, ok: true });
    } catch (e) {
      onProgress && onProgress({ index: i, total: prompts.length, error: e.message, ok: false });
    }
  }
  return out;
}

Object.assign(window, { useSpeech, parseOrder, parseOrderHeuristic, chatWithAI, callAI, speak, cancelSpeak, azureTTS, azureTranscribe, applyMenuAutocorrect, buildMenuPrompt, loadAIConfig, saveAIConfig, generateAngleVariants, nanoBananaGenerate, loadImgGenConfig, saveImgGenConfig, searchPexels, fetchDishPhotosFromPexels, fetchDishPhotoFromWikipedia, autoFetchDishPhoto, getPexelsKey, setPexelsKey });

/**
 * Digital-ID DB (CSV-driven, no server-side)
 * Pages:
 * - index.html : comparison table
 * - country.html: country detail + timeline (/country.html?id=JPN)
 *
 * Source of Truth: CSV in ./data
 */
const DATA_DIR = "./data";

// World map pins:
// - Pin positions are taken ONLY from countries.csv: map_lon/map_lat (+ map_dx/map_dy).
// - map_lon/map_lat are treated as UI coordinates in percent (0..100), not real lon/lat.
const MAP_DEBUG = false; // true: log + enable click-to-read coordinates

// ✅ Default selected countries
const DEFAULT_COUNTRIES = ["JPN", "EST", "DNK", "KOR"];

// ✅ Baseline country (always shown in comparison; not shown in chips)
const BASELINE_COUNTRY = "JPN";
// ✅ Event type canonical labels (for timeline; CSV remains SoT)
const EVENT_TYPE_ORDER = [
  '制度開始','施行','法制定','法改正','拡張','パイロット','発表','事故','終了'
];


/* =========================================================
 * Helpers: CSV
 * ======================================================= */
function stripBOM(text) {
  return (text ?? "").replace(/^\uFEFF/, "");
}

// Robust CSV parser (supports quoted fields, commas, newlines in quotes)
function parseCSV(text) {
  text = stripBOM(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // ignore CR
      } else {
        field += c;
      }
    }
  }

  row.push(field);
  rows.push(row);

  const header = (rows.shift() || []).map((h) => (h ?? "").trim());

  return rows
    .filter((r) => r.length > 1 && r.some((x) => (x ?? "").trim() !== ""))
    .map((r) => {
      const obj = {};
      header.forEach((h, idx) => {
        obj[h] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}

async function fetchCSV(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  const text = await res.text();
  return parseCSV(text);
}

// Optional loader: if missing, just return empty array
async function fetchCSVOptional(path) {
  try {
    return await fetchCSV(path);
  } catch (e) {
    console.warn("Optional CSV not loaded:", path, e?.message);
    return [];
  }
}

function unique(arr) {
  return Array.from(new Set(arr));
}

/**
 * value format:
 * - "Local\nSome detail" (newline)
 * - "Local \n Some detail" (space-newline-space)
 */
function splitValue(value) {
  const raw = (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  let parts;
  if (raw.includes(" \n ")) {
    parts = raw
      .split(" \n ")
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    parts = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return {
    main: parts[0] || "",
    detail: parts.slice(1).join(" "),
  };
}

/**
 * source_url format support (both):
 * - JSON array string: ["https://a","https://b"]
 * - legacy string: "https://a;https://b"
 */
function parseSourceUrls(sourceUrlField) {
  const raw = (sourceUrlField || "").trim();
  if (!raw) return [];

  // JSON array form
  if (raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      // fall through to legacy parser
    }
  }

  // Legacy form: semicolon/newline separated
  return raw
    .split(/[;\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* =========================================================
 * Classification (for cell coloring)
 * ======================================================= */
function classify(mainValue) {
  const v = (mainValue ?? "").toLowerCase();

  // strong/positive
  if (["yes", "nationwide", "national", "shared-platform", "adequacy", "common"].includes(v)) {
    return "nationwide";
  }

  // middle/partial/complex
  if (["partial", "local", "restricted", "multiple", "procurement", "migration", "equivalent"].includes(v)) {
    return "partial";
  }

  // none/planned
  if (["no", "none", "planned", "developing", "pilot", "paused"].includes(v)) {
    return "planned";
  }

  return "partial";
}

function parseQuery() {
  const params = new URLSearchParams(location.search);
  return Object.fromEntries(params.entries());
}

function normalizeId(s) {
  return (s ?? "").trim();
}

function normalizeCountryId(s) {
  return normalizeId(s).toUpperCase();
}

/* =========================================================
 * Flag images (FlagCDN)
 * ======================================================= */
const ISO2_FALLBACK_BY_ID = {
  JPN: "jp",
  KOR: "kr",
  EST: "ee",
  FRA: "fr",
  DEU: "de",
  GBR: "gb",
  USA: "us",
  CAN: "ca",
  AUS: "au",
  NZL: "nz",
  SWE: "se",
  DNK: "dk",
  SGP: "sg",
  IND: "in",
};

function flagEmojiToISO2(flagEmoji) {
  // Regional indicator symbols: U+1F1E6..U+1F1FF map to A..Z
  const chars = Array.from((flagEmoji ?? "").trim());
  if (chars.length < 2) return "";

  const codePoints = chars.map((ch) => ch.codePointAt(0));
  const letters = codePoints
    .filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)
    .map((cp) => String.fromCharCode(cp - 0x1f1e6 + "A".charCodeAt(0)));

  if (letters.length >= 2) return letters.slice(0, 2).join("").toLowerCase();
  return "";
}

function getISO2(countryId, countryRecord) {
  const iso2 =
    (countryRecord?.iso2 ?? "").trim().toLowerCase() ||
    flagEmojiToISO2(countryRecord?.flag) ||
    ISO2_FALLBACK_BY_ID[normalizeCountryId(countryId)] ||
    "";
  return iso2;
}

function getCountryName(countryId, countryRecord) {
  return (
    (countryRecord?.name_ja || countryRecord?.name_en || normalizeCountryId(countryId) || "").trim()
  );
}

function createFlagImgElement(countryId, countryRecord, size = "20x15") {
  const iso2 = getISO2(countryId, countryRecord);
  if (!iso2) return null;

  const [wStr, hStr] = size.split("x");
  const w = Number(wStr) || 20;
  const h = Number(hStr) || 15;

  const img = document.createElement("img");
  img.className = "flagIcon";
  img.width = w;
  img.height = h;
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = `${getCountryName(countryId, countryRecord)} flag`;
  img.src = `https://flagcdn.com/${size}/${iso2}.png`;
  img.srcset = `https://flagcdn.com/${w * 2}x${h * 2}/${iso2}.png 2x, https://flagcdn.com/${w * 3}x${h * 3}/${iso2}.png 3x`;
  img.onerror = () => {
    img.style.display = "none";
  };
  return img;
}

function appendCountryLabel(container, countryId, countryRecord, options = {}) {
  const { size = "20x15", showCode = false, linkToCountryPage = false } = options;

  const id = normalizeCountryId(countryId);
  const name = getCountryName(id, countryRecord);

  const wrap = document.createElement("span");
  wrap.className = "flagWrap";
  wrap.title = `${name} (${id})`;

  const flagImg = createFlagImgElement(id, countryRecord, size);
  if (flagImg) wrap.appendChild(flagImg);

  const textSpan = document.createElement("span");
  textSpan.textContent = showCode ? `${name} (${id})` : name;
  wrap.appendChild(textSpan);

  if (linkToCountryPage) {
    const a = document.createElement("a");
    a.className = "countryLink";
    a.href = `./country.html?id=${encodeURIComponent(id)}`;
    a.appendChild(wrap);
    container.appendChild(a);
  } else {
    container.appendChild(wrap);
  }
}

/* =========================================================
 * Detail translation (EN -> JA)
 * ======================================================= */
let detailJaMap = new Map();

function translateTextToJa(text) {
 const key = (text ?? "").trim();
 if (!key) return "";
 return detailJaMap.get(key) ?? key;
}

function translateDetailToJa(detailText) {
  const key = (detailText ?? "").trim();
  if (!key) return "";
  return detailJaMap.get(key) ?? key;
}

/* =========================================================
 * App state
 * ======================================================= */
let countries = [];
let indicators = [];
let countryIndicator = [];
let events = [];
let selectedCountries = new Set(DEFAULT_COUNTRIES);

/* =========================================================
 * Page detection
 * ======================================================= */
const hasComparison = !!document.getElementById("comparisonTable");
const hasWorldMap = !!document.getElementById("worldmapPins");
const hasCountry = !!document.getElementById("countryIndicators");

/* =========================================================
 * DOM
 * ======================================================= */
const versionSelect = document.getElementById("versionSelect");
const statusSelect = document.getElementById("statusSelect");

function setMetaNote(text) {
  const meta = document.getElementById("meta") || document.getElementById("countryMeta");
  if (meta && text) {
    if (!meta.textContent) meta.textContent = text;
  }
}

/* =========================================================
 * Init
 * ======================================================= */
(async function init() {
  const loaders = [
    fetchCSV(`${DATA_DIR}/countries.csv`),
    fetchCSV(`${DATA_DIR}/indicators.csv`),
    fetchCSV(`${DATA_DIR}/country_indicator.csv`),
    fetchCSVOptional(`${DATA_DIR}/translations_ja.csv`),
  ];
  if (hasCountry) loaders.push(fetchCSVOptional(`${DATA_DIR}/events.csv`));

  const loaded = await Promise.all(loaders);

  countries = loaded[0];
  indicators = loaded[1];
  countryIndicator = loaded[2];

  // Load translations_ja.csv (if exists) as the ONLY detail translation dictionary
  const translations = loaded[3] || [];
  detailJaMap = new Map();
  translations
    .filter((r) => (r.en ?? "").trim())
    .forEach((r) => {
      detailJaMap.set((r.en ?? "").trim(), (r.ja ?? "").trim());
    });

  if (!translations.length) {
    console.warn("translations_ja.csv is empty or not loaded");
    setMetaNote("注意：translations_ja.csv が読み込めないため、detailは原文表示になります。");
  }

  // Optional: report missing translation keys (console only; UI stays CSV-driven)
  try {
    const details = unique(countryIndicator.map((r) => splitValue(r.value).detail).filter(Boolean));
    const missing = details.filter((d) => !detailJaMap.has((d ?? "").trim()));
    if (missing.length) console.info(`translations_ja.csv: missing ${missing.length} detail entries`, missing.slice(0, 20));
  } catch {
    /* ignore */
  }

  events = hasCountry ? (loaded[4] || []) : [];

  // versions from country_indicator
  const versions = unique(countryIndicator.map((r) => r.version).filter(Boolean)).sort().reverse();

  if (versionSelect) {
    versionSelect.innerHTML = "";
    versions.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      versionSelect.appendChild(opt);
    });
    if (versions.length) versionSelect.value = versions[0];
  }

  if (versionSelect) versionSelect.addEventListener("change", renderAll);
  if (statusSelect) statusSelect.addEventListener("change", renderAll);

  if (hasComparison) {
    renderCountryChips();
    wireCountryChipActions();
  }

  renderAll();
})().catch((err) => {
  console.error(err);
  const meta = document.getElementById("meta") || document.getElementById("countryMeta");
  if (meta) meta.textContent = `エラー：${err.message}`;
});

/* =========================================================
 * Render dispatcher
 * ======================================================= */
function renderAll() {
  if (hasComparison) {
    renderComparison();
    if (hasWorldMap) renderWorldMap();
  }
  if (hasCountry) renderCountryPage();
}

/* =========================================================
 * index.html rendering
 * ======================================================= */
function getCountriesByIdMap() {
  const map = new Map();
  countries.forEach((c) => {
    const id = normalizeCountryId(c.country_id);
    if (id) map.set(id, c);
  });
  return map;
}

function wireCountryChipActions() {
  const btnAll = document.getElementById("selectAllCountries");
  const btnNone = document.getElementById("clearAllCountries");
  if (!btnAll && !btnNone) return;

  const allIds = unique(countryIndicator.map((r) => normalizeCountryId(r.country_id))).filter(Boolean).sort();

  if (btnAll) {
    btnAll.addEventListener("click", () => {
      selectedCountries = new Set(allIds);
      selectedCountries.add(BASELINE_COUNTRY);
      document.querySelectorAll("#countryChips input[type=checkbox][data-country]").forEach((cb) => {
        cb.checked = true;
      });
      renderAll();
    });
  }

  if (btnNone) {
    btnNone.addEventListener("click", () => {
      selectedCountries = new Set([BASELINE_COUNTRY]);
      document.querySelectorAll("#countryChips input[type=checkbox][data-country]").forEach((cb) => {
        cb.checked = false;
      });
      renderAll();
    });
  }
}

function renderCountryChips() {
  const countryChips = document.getElementById("countryChips");
  if (!countryChips) return;

  const byId = getCountriesByIdMap();

  // Baseline is always selected, but NOT shown in chips UI
  selectedCountries.add(BASELINE_COUNTRY);

  const allIds = unique(countryIndicator.map((r) => normalizeCountryId(r.country_id)))
    .filter(Boolean)
    .sort();

  countryChips.innerHTML = "";
  allIds.forEach((id) => {
    if (id === BASELINE_COUNTRY) return; // skip JPN chip

    const c = byId.get(id) ?? {};
    const label = document.createElement("label");
    label.className = "chip";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.setAttribute("data-country", id);
    cb.checked = selectedCountries.has(id);

    cb.addEventListener("change", () => {
      const cid = normalizeCountryId(cb.getAttribute("data-country"));
      if (cb.checked) selectedCountries.add(cid);
      else selectedCountries.delete(cid);

      // baseline safety
      selectedCountries.add(BASELINE_COUNTRY);

      renderComparison();
    });

    const span = document.createElement("span");
    appendCountryLabel(span, id, c, { size: "20x15", showCode: false, linkToCountryPage: false });

    label.appendChild(cb);
    label.appendChild(span);
    countryChips.appendChild(label);
  });
}

function renderComparison() {
  const table = document.getElementById("comparisonTable");
  const meta = document.getElementById("meta");
  if (!table) return;

  // baseline safety
  selectedCountries.add(BASELINE_COUNTRY);

  const version = versionSelect?.value || "";
  const status = statusSelect?.value || "published";

  const filtered = countryIndicator.filter((r) => {
    const cid = normalizeCountryId(r.country_id);
    return r.version === version && r.review_status === status && selectedCountries.has(cid);
  });

  // Column order: baseline always leftmost; others sorted
  const present = Array.from(selectedCountries)
    .map(normalizeCountryId)
    .filter((id) => filtered.some((r) => normalizeCountryId(r.country_id) === id));
  const others = present.filter((id) => id !== BASELINE_COUNTRY).sort();
  const countryIds = [BASELINE_COUNTRY, ...others];

  const byId = getCountriesByIdMap();

  // Lookup: `${CID}__${IID}` -> record
  const lookup = new Map();
  filtered.forEach((r) => {
    const cid = normalizeCountryId(r.country_id);
    const iid = normalizeId(r.indicator_id);
    lookup.set(`${cid}__${iid}`, r);
  });

  // indicator order: display_order then indicator_id
  const indicatorOrder = indicators.slice().filter((i) => (i.indicator_id ?? '').trim() !== 'I11').sort((a, b) => {
    const ao = a.display_order != null && a.display_order !== "" ? Number(a.display_order) : 999;
    const bo = b.display_order != null && b.display_order !== "" ? Number(b.display_order) : 999;
    if (ao !== bo) return ao - bo;
    return (a.indicator_id || "").localeCompare(b.indicator_id || "");
  });

  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headTr = document.createElement("tr");

  const firstTh = document.createElement("th");
  firstTh.textContent = "制度項目";
  headTr.appendChild(firstTh);

  countryIds.forEach((id) => {
    const th = document.createElement("th");
    const c = byId.get(id) || {};
    appendCountryLabel(th, id, c, { size: "20x15", showCode: false, linkToCountryPage: true });
    headTr.appendChild(th);
  });

  thead.appendChild(headTr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  indicatorOrder.forEach((ind) => {
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.textContent = ind.name_ja || ind.name_en || ind.indicator_id || "";
    tr.appendChild(th);

    countryIds.forEach((cid) => {
      const td = document.createElement("td");
      const rec = lookup.get(`${cid}__${ind.indicator_id}`);

      if (!rec) {
        td.className = "planned";
        const cell = document.createElement("div");
        cell.className = "cell";
        const v = document.createElement("div");
        v.className = "value";
        v.textContent = "—";
        const d = document.createElement("div");
        d.className = "detail";
        d.textContent = "データなし";
        cell.appendChild(v);
        cell.appendChild(d);
        td.appendChild(cell);
        tr.appendChild(td);
        return;
      }

      const { main, detail } = splitValue(rec.value);
      const cls = classify(main);
      td.className = cls;

      const cell = document.createElement("div");
      cell.className = "cell";

      const v = document.createElement("div");
      v.className = "value";
      v.textContent = main; // main is kept as-is (EN)
      cell.appendChild(v);

      const detailJa = translateDetailToJa(detail);
      if (detailJa) {
        const d1 = document.createElement("div");
        d1.className = "detail";
        d1.textContent = detailJa;
        cell.appendChild(d1);
      }

      const d2 = document.createElement("div");
      d2.className = "detail";

      if (rec.tags) {
        const tagLine = document.createElement("div");
 tagLine.className = "tagsLine";
 tagLine.textContent = `tags: ${rec.tags}`;
        d2.appendChild(tagLine);
      }

      const srcs = parseSourceUrls(rec.source_url);
      if (srcs.length) {
        const srcLine = document.createElement("div");
        srcs.forEach((u, i) => {
          const a = document.createElement("a");
          a.href = u;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = `出典${i + 1}`;
          srcLine.appendChild(a);
          if (i < srcs.length - 1) srcLine.appendChild(document.createTextNode(" / "));
        });
        d2.appendChild(srcLine);
      } else {
        const none = document.createElement("div");
        none.textContent = "出典なし";
        d2.appendChild(none);
      }

      cell.appendChild(d2);
      td.appendChild(cell);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  if (meta) {
    meta.textContent = `表示：version=${version} / status=${status} / countries=${countryIds.join(", ")}`;
  }
}

/* =========================================================
 * World map (CSV-coordinates only)
 * ======================================================= */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function enableMapClickDebugger(mapEl) {
  if (!MAP_DEBUG || !mapEl) return;
  mapEl.addEventListener("click", (ev) => {
    const rect = mapEl.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;
    console.log("[MAP_DEBUG] click x%/y% =", x.toFixed(2), y.toFixed(2));
  });
}

function toPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function renderWorldMap() {
  const pins = document.getElementById("worldmapPins");
  const map = document.getElementById("worldmap");
  if (!pins || !map) return;

  enableMapClickDebugger(map);

  const byId = getCountriesByIdMap();
  const available = unique(countryIndicator.map((r) => normalizeCountryId(r.country_id)))
    .filter(Boolean)
    .sort();

  pins.innerHTML = "";
  available.forEach((id) => {
    const c = byId.get(id) || {};

    let x = toPercent(c.map_lon);
    let y = toPercent(c.map_lat);
    if (x == null || y == null) return;

    const dx = Number(c.map_dx);
    const dy = Number(c.map_dy);
    if (Number.isFinite(dx)) x += dx;
    if (Number.isFinite(dy)) y += dy;

    x = clamp(x, 1, 99);
    y = clamp(y, 1, 99);

    const a = document.createElement("a");
    a.className = "map-pin";
    a.href = `./country.html?id=${encodeURIComponent(id)}`;
    a.style.left = `${x}%`;
    a.style.top = `${y}%`;
    a.setAttribute("aria-label", `${getCountryName(id, c)} (${id})`);

    const flag = createFlagImgElement(id, c, "20x15");
    if (flag) a.appendChild(flag);

    const label = document.createElement("span");
    label.className = "pin-label";
    label.textContent = getCountryName(id, c);
    a.appendChild(label);

    pins.appendChild(a);
  });
}

/* =========================================================
 * country.html rendering
 * ======================================================= */
function renderCountryPage() {
  const q = parseQuery();
  const countryId = normalizeCountryId(q.id || "JPN");

  const title = document.getElementById("countryTitle");
  const subtitle = document.getElementById("countrySubtitle");
  const meta = document.getElementById("countryMeta");
  const container = document.getElementById("countryIndicators");
  const timeline = document.getElementById("countryEvents");

  const version = versionSelect?.value || "";
  const status = statusSelect?.value || "published";

  const byId = getCountriesByIdMap();
  const c = byId.get(countryId) || { country_id: countryId };

  if (title) {
    title.innerHTML = "";
    appendCountryLabel(title, countryId, c, { size: "20x15", showCode: true, linkToCountryPage: false });
  }
  if (subtitle) subtitle.textContent = `version=${version} / status=${status}`;

  const rows = countryIndicator.filter((r) => {
    return normalizeCountryId(r.country_id) === countryId && r.version === version && r.review_status === status;
  });

  const lookup = new Map(rows.map((r) => [normalizeId(r.indicator_id), r]));

  const indicatorOrder = indicators.slice().filter((i) => (i.indicator_id ?? '').trim() !== 'I11').sort((a, b) => {
    const ao = a.display_order != null && a.display_order !== "" ? Number(a.display_order) : 999;
    const bo = b.display_order != null && b.display_order !== "" ? Number(b.display_order) : 999;
    if (ao !== bo) return ao - bo;
    return (a.indicator_id || "").localeCompare(b.indicator_id || "");
  });

  if (meta) meta.textContent = `国: ${countryId} / 行数: ${rows.length}`;

  if (container) {
    container.innerHTML = "";
    indicatorOrder.forEach((ind) => {
      const rec = lookup.get(ind.indicator_id);
      const name = ind.name_ja || ind.name_en || ind.indicator_id || "";

      if (!rec) {
        const article = document.createElement("article");
        article.className = "item planned";
        const h3 = document.createElement("h3");
        h3.textContent = name;
        const v = document.createElement("div");
        v.className = "value";
        v.textContent = "—";
        const d = document.createElement("div");
        d.className = "detail";
        d.textContent = "データなし";
        article.appendChild(h3);
        article.appendChild(v);
        article.appendChild(d);
        container.appendChild(article);
        return;
      }

      const { main, detail } = splitValue(rec.value);
      const cls = classify(main);
      const detailJa = translateDetailToJa(detail);

      const article = document.createElement("article");
      article.className = `item ${cls}`;

      const h3 = document.createElement("h3");
      h3.textContent = name;

      const v = document.createElement("div");
      v.className = "value";
      v.textContent = main;

      article.appendChild(h3);
      article.appendChild(v);

      if (detailJa) {
        const d1 = document.createElement("div");
        d1.className = "detail";
        d1.textContent = detailJa;
        article.appendChild(d1);
      }

      if (rec.tags) {
        const dTags = document.createElement("div");
 dTags.className = "detail tagsLine";
 dTags.textContent = `tags: ${rec.tags}`;
        article.appendChild(dTags);
      }

      const srcs = parseSourceUrls(rec.source_url);
      const d2 = document.createElement("div");
      d2.className = "detail";
      if (srcs.length) {
        srcs.forEach((u, i) => {
          const a = document.createElement("a");
          a.href = u;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = `公式出典${i + 1}`;
          d2.appendChild(a);
          if (i < srcs.length - 1) d2.appendChild(document.createTextNode(" / "));
        });
      } else {
        d2.textContent = "出典なし";
      }

      article.appendChild(d2);
      container.appendChild(article);
    });
  }

  // events timeline (if events.csv exists/loaded)
  if (timeline) {
    const ev = (events || [])
      .filter((e) => normalizeCountryId(e.country_id) === countryId)
      .slice()
      .sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));

    timeline.innerHTML = "";
    if (!ev.length) {
      const none = document.createElement("div");
      none.className = "detail";
      none.textContent = "年表データがありません。";
      timeline.appendChild(none);
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "timeline";

    ev.forEach((e) => {
      const li = document.createElement("li");

      const d = document.createElement("div");
      d.className = "t-date";
      d.textContent = e.event_date || "";

      const t = document.createElement("div");
      t.className = "t-title";
      t.textContent = e.title || "";

      const m = document.createElement("div");
      m.className = "t-meta";
      m.textContent = `${e.event_type || ""} / ${e.severity || ""}`.trim();

      const desc = document.createElement("div");
      desc.className = "t-desc";
      desc.textContent = e.description || "";

      li.appendChild(d);
      li.appendChild(t);
      li.appendChild(m);
      li.appendChild(desc);

      if (e.source_url) {
        const src = document.createElement("div");
        src.className = "detail";
        const a = document.createElement("a");
        a.href = e.source_url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "出典";
        src.appendChild(a);
        li.appendChild(src);
      }

      ul.appendChild(li);
    });

    timeline.appendChild(ul);
  }
}

/**
 * CSV-driven site generator (no libs)
 * - index.html: comparison table
 * - country.html: country detail + timeline
 */
const DATA_DIR = "./data";
const DEFAULT_COUNTRIES = ["JPN", "EST", "KOR", "FRA"];

// ---------- CSV helpers ----------
function stripBOM(text) { return text.replace(/^\uFEFF/, ""); }

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
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  row.push(field);
  rows.push(row);

  const header = rows.shift().map(h => h.trim());
  return rows
    .filter(r => r.length > 1 && r.some(x => (x ?? "").trim() !== ""))
    .map(r => {
      const obj = {};
      header.forEach((h, idx) => obj[h] = (r[idx] ?? "").trim());
      return obj;
    });
}

async function fetchCSV(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  return parseCSV(await res.text());
}

function unique(arr) { return Array.from(new Set(arr)); }

function splitValue(value) {
  const parts = (value || "").split("|").map(s => s.trim());
  return { main: parts[0] || "", detail: parts.slice(1).join(" | ") };
}

function escapeHTML(str) {
  return (str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function classify(mainValue) {
  const v = (mainValue || "").toLowerCase();
  if (["yes","nationwide","national","shared-platform","adequacy","common"].includes(v)) return "nationwide";
  if (["partial","local","restricted","multiple","procurement","migration","equivalent"].includes(v)) return "partial";
  if (["no","none","planned","developing","pilot","paused"].includes(v)) return "planned";
  return "partial";
}

function parseQuery() {
  const params = new URLSearchParams(location.search);
  return Object.fromEntries(params.entries());
}

// ---------- App state ----------
let countries = [];
let indicators = [];
let countryIndicator = [];
let events = [];
let selectedCountries = new Set(DEFAULT_COUNTRIES);

// ---------- Page detection ----------
const hasComparison = !!document.getElementById("comparisonTable");
const hasCountry = !!document.getElementById("countryIndicators");

// ---------- DOM ----------
const versionSelect = document.getElementById("versionSelect");
const statusSelect  = document.getElementById("statusSelect");

(async function init() {
  const loads = [
    fetchCSV(`${DATA_DIR}/countries.csv`),
    fetchCSV(`${DATA_DIR}/indicators.csv`),
    fetchCSV(`${DATA_DIR}/country_indicator.csv`)
  ];
  if (hasCountry) loads.push(fetchCSV(`${DATA_DIR}/events.csv`));

  [countries, indicators, countryIndicator, events] = await Promise.all(loads);

  // version dropdown
  const versions = unique(countryIndicator.map(r => r.version).filter(Boolean)).sort().reverse();
  if (versionSelect) {
    versionSelect.innerHTML = versions.map(v => `<option value="${v}">${v}</option>`).join("");
    if (versions.length) versionSelect.value = versions[0];
  }

  // events
  if (versionSelect) versionSelect.addEventListener("change", renderAll);
  if (statusSelect) statusSelect.addEventListener("change", renderAll);

  // index page: country chips
  if (hasComparison) renderCountryChips();

  renderAll();

})().catch(err => {
  console.error(err);
  const meta = document.getElementById("meta") || document.getElementById("countryMeta");
  if (meta) meta.textContent = `エラー：${err.message}`;
});

function renderAll() {
  if (hasComparison) renderComparison();
  if (hasCountry) renderCountryPage();
}

// ---------- index.html rendering ----------
function renderCountryChips() {
  const countryChips = document.getElementById("countryChips");
  if (!countryChips) return;

  const byId = new Map(countries.map(c => [c.country_id, c]));
  const allIds = unique(countryIndicator.map(r => r.country_id)).sort();

  countryChips.innerHTML = allIds.map(id => {
    const c = byId.get(id) || {};
    const label = c.name_ja || c.name_en || id;
    const checked = selectedCountries.has(id) ? "checked" : "";
    return `
      <label class="chip">
        <input type="checkbox" data-country="${id}" ${checked} />
        <span>${escapeHTML(label)} (${escapeHTML(id)})</span>
      </label>
    `;
  }).join("");

  countryChips.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const id = cb.getAttribute("data-country");
      if (cb.checked) selectedCountries.add(id);
      else selectedCountries.delete(id);
      renderComparison();
    });
  });
}

function renderComparison() {
  const table = document.getElementById("comparisonTable");
  const meta  = document.getElementById("meta");
  if (!table) return;

  const version = versionSelect?.value || "";
  const status  = statusSelect?.value || "published";

  const rows = countryIndicator.filter(r =>
    r.version === version &&
    r.review_status === status &&
    selectedCountries.has(r.country_id)
  );

  const countryIds = Array.from(selectedCountries).filter(id =>
    rows.some(r => r.country_id === id)
  );

  const lookup = new Map();
  rows.forEach(r => lookup.set(`${r.country_id}__${r.indicator_id}`, r));

  const indicatorOrder = indicators.slice().sort((a, b) =>
    (a.display_order || a.indicator_id).toString().localeCompare((b.display_order || b.indicator_id).toString())
  );

  const byId = new Map(countries.map(c => [c.country_id, c]));

  const headerCells = countryIds.map(id => {
    const c = byId.get(id) || {};
    const label = `${c.flag || ""} ${c.name_ja || c.name_en || id}`.trim();
    return `<th><a class="countryLink" href="./country.html?id=${encodeURIComponent(id)}">${escapeHTML(label)}</a></th>`;
  }).join("");

  const bodyRows = indicatorOrder.map(ind => {
    const name = ind.name_ja || ind.name_en || ind.indicator_id;

    const rowCells = countryIds.map(cid => {
      const rec = lookup.get(`${cid}__${ind.indicator_id}`);
      if (!rec) {
        return `<td class="planned"><div class="cell"><div class="value">—</div><div class="detail">データなし</div></div></td>`;
      }

      const { main, detail } = splitValue(rec.value);
      const cls = classify(main);

      const src = (rec.source_url || "")
        .split(";").map(s => s.trim()).filter(Boolean);

      const sourceLinks = src.length
        ? src.map((u, i) => `<a href="${u}" target="_blank" rel="noopener">出典${i + 1}</a>`).join(" / ")
        : "出典なし";

      const tags = rec.tags ? `tags: ${escapeHTML(rec.tags)}` : "";

      return `
        <td class="${cls}">
          <div class="cell">
            <div class="value">${escapeHTML(main)}</div>
            ${detail ? `<div class="detail">${escapeHTML(detail)}</div>` : ""}
            <div class="detail">${tags ? `${tags}<br/>` : ""}${sourceLinks}</div>
          </div>
        </td>
      `;
    }).join("");

    return `<tr><th>${escapeHTML(name)}</th>${rowCells}</tr>`;
  }).join("");

  table.innerHTML = `
    <thead>
      <tr>
        <th>制度項目</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  `;

  if (meta) meta.textContent = `表示：version=${version} / status=${status} / countries=${countryIds.join(", ")}`;
}

// ---------- country.html rendering ----------
function renderCountryPage() {
  const q = parseQuery();
  const countryId = q.id || "JPN";

  const title = document.getElementById("countryTitle");
  const subtitle = document.getElementById("countrySubtitle");
  const meta = document.getElementById("countryMeta");
  const container = document.getElementById("countryIndicators");
  const timeline = document.getElementById("countryEvents");

  const version = versionSelect?.value || "";
  const status  = statusSelect?.value || "published";

  const c = countries.find(x => x.country_id === countryId) || { country_id: countryId };
  if (title) title.textContent = `${c.flag || ""} ${c.name_ja || c.name_en || c.country_id}`.trim();
  if (subtitle) subtitle.textContent = `version=${version} / status=${status}`;

  const rows = countryIndicator
    .filter(r => r.country_id === countryId && r.version === version && r.review_status === status);

  const lookup = new Map(rows.map(r => [`${r.indicator_id}`, r]));
  const indicatorOrder = indicators.slice().sort((a, b) =>
    (a.display_order || a.indicator_id).toString().localeCompare((b.display_order || b.indicator_id).toString())
  );

  if (meta) meta.textContent = `国: ${countryId} / 行数: ${rows.length}`;

  if (container) {
    container.innerHTML = indicatorOrder.map(ind => {
      const rec = lookup.get(ind.indicator_id);
      const name = ind.name_ja || ind.name_en || ind.indicator_id;

      if (!rec) {
        return `
          <article class="item planned">
            <h3>${escapeHTML(name)}</h3>
            <div class="value">—</div>
            <div class="detail">データなし</div>
          </article>
        `;
      }

      const { main, detail } = splitValue(rec.value);
      const cls = classify(main);

      const src = (rec.source_url || "")
        .split(";").map(s => s.trim()).filter(Boolean);

      const links = src.length
        ? src.map((u, i) => `<a href="${u}" target="_blank" rel="noopener">公式出典${i + 1}</a>`).join(" / ")
        : "出典なし";

      return `
        <article class="item ${cls}">
          <h3>${escapeHTML(name)}</h3>
          <div class="value">${escapeHTML(main)}</div>
          ${detail ? `<div class="detail">${escapeHTML(detail)}</div>` : ""}
          ${rec.tags ? `<div class="detail">tags: ${escapeHTML(rec.tags)}</div>` : ""}
          <div class="detail">${links}</div>
        </article>
      `;
    }).join("");
  }

  // timeline
  const ev = (events || []).filter(e => e.country_id === countryId)
    .slice()
    .sort((a,b) => (a.event_date || "").localeCompare(b.event_date || ""));

  if (timeline) {
    timeline.innerHTML = ev.length ? `
      <ul class="timeline">
        ${ev.map(e => `
          <li>
            <div class="t-date">${escapeHTML(e.event_date)}</div>
            <div class="t-title">${escapeHTML(e.title)}</div>
            <div class="t-meta">${escapeHTML(e.event_type)} / ${escapeHTML(e.severity)}</div>
            <div class="t-desc">${escapeHTML(e.description)}</div>
            ${e.source_url ? `<a href="${e.source_url}" target="_blank" rel="noopener">出典</a>` : ""}
          </li>
        `).join("")}
      </ul>
    ` : `<div class="detail">年表データがありません。</div>`;
  }

}

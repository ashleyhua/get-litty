// script.js — dynamic table + search + surprise + query buttons + map placeholder
const backendURL = "http://localhost:5000";

/* ---------------- Generic fetch + normalizer ---------------- */
async function fetchEventsFromEndpoint(path) {
  const url = `${backendURL}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(normalizeRow);
  } catch (err) {
    console.error("[fetch] error", err);
    return [];
  }
}

function normalizeRow(e) {
  return {
    id: e.event_id ?? e.id ?? null,
    name: e.event_name ?? e.name ?? "",
    venue_name: e.venue_name ?? e.venue ?? "",
    city_name: e.city_name ?? e.city ?? "",
    state: e.state ?? "",
    date: e.date ? e.date.split?.("T")[0] ?? e.date : "",
    distance: Number(e.distance ?? e.distance_mi ?? 0),
    avg_airbnb: Number(e.price_per_night ?? e.avg_price ?? e.avg_airbnb ?? 0),
    ticket_price: Number(e.ticket_price ?? e.price ?? 0),
    estimated_total_cost: Number(e.estimated_total_cost ?? e.cheapest_total_cost ?? 0),
    venue_lat: Number(e.venue_lat ?? NaN),
    venue_lng: Number(e.venue_lng ?? NaN)
  };
}

/* ---------------- Dynamic table rendering ---------------- */
function populateTable(events) {
  const table = document.getElementById("resultsTable");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  if (!events || events.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="muted">No results found</td></tr>`;
    return;
  }

  // determine extra columns dynamically
  const first = events[0];
  const extraKeys = Object.keys(first).filter(k =>
    !["id","name","venue_name","city_name","state","date","distance","avg_airbnb"].includes(k)
  );

  thead.innerHTML = "<tr>" + [
    "<th>#</th>",
    "<th>Event</th>",
    "<th>City</th>",
    "<th>Date</th>",
    "<th>Venue</th>",
    "<th>Distance (mi)</th>",
    "<th>Avg Airbnb ($)</th>",
    ...extraKeys.map(k => `<th>${k.replace(/_/g," ")}</th>`)
  ].join("") + "</tr>";

  events.forEach((e, idx) => {
    const row = document.createElement("tr");
    const safe = v => v == null ? "" : v;
    const fmtMoney = n => Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
    const fmtDist = n => Number.isFinite(n) ? n.toFixed(1) : "0.0";

    row.innerHTML = `
      <td>${idx+1}</td>
      <td>${escapeHtml(safe(e.name))}</td>
      <td>${escapeHtml(safe(e.city_name))}, ${escapeHtml(safe(e.state))}</td>
      <td>${escapeHtml(safe(e.date))}</td>
      <td>${escapeHtml(safe(e.venue_name))}</td>
      <td style="text-align:right">${fmtDist(e.distance)}</td>
      <td style="text-align:right">${fmtMoney(e.avg_airbnb)}</td>
      ${extraKeys.map(k => {
        let val = e[k];
        if (["ticket_price","estimated_total_cost","closest_listing_distance","avg_price","avg_airbnb"].includes(k)) val = fmtMoney(val);
        if (["distance","closest_listing_distance"].includes(k)) val = fmtDist(val);
        return `<td style="text-align:right">${escapeHtml(val)}</td>`;
      }).join("")}
    `;
    tbody.appendChild(row);
  });
}

/* ---------------- Best panel ---------------- */
function renderBest(events) {
  const bestPanel = document.getElementById("bestPanel");
  if (!events || events.length === 0) { bestPanel.style.display = "none"; return; }
  const b = events[0];
  bestPanel.style.display = "block";

  let extras = [];
  if (Number.isFinite(b.distance)) extras.push(`Distance: ${b.distance.toFixed(1)} mi`);
  if (Number.isFinite(b.ticket_price) && b.ticket_price>0) extras.push(`Ticket: $${b.ticket_price.toFixed(2)}`);
  if (Number.isFinite(b.avg_airbnb)) extras.push(`Airbnb: $${b.avg_airbnb.toFixed(2)}`);
  if (Number.isFinite(b.estimated_total_cost) && b.estimated_total_cost>0) extras.push(`Total: $${b.estimated_total_cost.toFixed(2)}`);

  bestPanel.innerHTML = `
    <strong>Best Option</strong>
    <div>${escapeHtml(b.name)} — ${escapeHtml(b.city_name)}, ${escapeHtml(b.state)} on ${escapeHtml(b.date)}</div>
    <div>${escapeHtml(extras.join(" • "))}</div>
  `;
}

/* ---------- Utilities ---------- */
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])
  );
}

/* ---------- Attach buttons ---------- */
function attachIfExists(id, handler) { const el=document.getElementById(id); if(el) el.addEventListener("click", handler); }

attachIfExists("searchBtn", async () => {
  const q = encodeURIComponent(document.getElementById("searchInput").value.trim());
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const maxDist = document.getElementById("distanceRange").value;
  const url = `/events/search?name=${q}&startDate=${start}&endDate=${end}&maxDistance=${maxDist}`;
  const events = await fetchEventsFromEndpoint(url);
  populateTable(events);
  renderBest(events);
});

attachIfExists("surpriseBtn", async () => {
  const events = await fetchEventsFromEndpoint("/events/recommendations");
  populateTable(events);
  renderBest(events);
});

attachIfExists("q1Btn", async () => { const events = await fetchEventsFromEndpoint("/events/cheapest"); populateTable(events); renderBest(events); });
attachIfExists("q2Btn", async () => { const events = await fetchEventsFromEndpoint("/events/illinois-cheapest"); populateTable(events); renderBest(events); });
attachIfExists("q3Btn", async () => { const events = await fetchEventsFromEndpoint("/events/most-availability"); populateTable(events); renderBest(events); });
attachIfExists("q4Btn", async () => { const events = await fetchEventsFromEndpoint("/events/chicago-below-avg"); populateTable(events); renderBest(events); });

/* ---------- Distance range UI ---------- */
const distRange=document.getElementById("distanceRange"), distVal=document.getElementById("distVal");
if(distRange && distVal){ distVal.textContent=distRange.value; distRange.addEventListener("input",()=>distVal.textContent=distRange.value); }

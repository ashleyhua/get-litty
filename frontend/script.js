// script.js
// backend base URL
const backendURL = "http://localhost:5000";


async function fetchEventsFromEndpoint(path) {
  const url = `${backendURL}${path}`;
  console.log("[fetch] GET", url);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      console.error("[fetch] non-OK response:", res.status, body);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn("[fetch] expected array, got:", data);
      return [];
    }
    return data.map(normalizeRow);
  } catch (err) {
    console.error("[fetch] error", err);
    return [];
  }
}

/**
 * Normalize a DB row into the format the frontend expects:
 * { id, name, venue_name, city_name, state, date, distance, avg_airbnb, ticket_price, estimated_total_cost }
 */
function normalizeRow(e) {
  return {
    id: e.event_id ?? e.id ?? null,
    name: e.event_name ?? e.name ?? "",
    venue_name: e.venue_name ?? e.venue ?? "",
    city_name: e.city_name ?? e.city ?? "",
    state: e.state ?? "",
    date: (e.date && typeof e.date === "string" && e.date.split) ? e.date.split("T")[0] : (e.date || ""),
    distance: Number(e.distance ?? e.distance_mi ?? e.dist_mi ?? 0),
    avg_airbnb: Number(e.price_per_night ?? e.avg_price ?? e.avg_airbnb ?? 0),
    ticket_price: Number(e.ticket_price ?? e.price ?? 0),
    estimated_total_cost: Number(e.estimated_total_cost ?? e.cheapest_total_cost ?? e.estimated_total_cost ?? 0)
  };
}

/**
 * populateTable - renders the table rows
 */
function populateTable(events) {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";

  if (!events || !events.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">No results found</td></tr>`;
    return;
  }

  events.forEach((e, idx) => {
    const row = document.createElement("tr");

    const safe = v => (v === null || v === undefined ? "" : v);
    const fmtMoney = n => (Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00");
    const fmtDist = n => (Number.isFinite(n) ? n.toFixed(1) : "0.0");

    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(safe(e.name))}</td>
      <td>${escapeHtml(safe(e.city_name))}, ${escapeHtml(safe(e.state))}</td>
      <td>${escapeHtml(safe(e.date))}</td>
      <td>${escapeHtml(safe(e.venue_name))}</td>
      <td style="text-align:right">${fmtDist(e.distance)}</td>
      <td style="text-align:right">${fmtMoney(e.avg_airbnb)}</td>
    `;

    row.addEventListener("click", () => {
      document.querySelectorAll("#resultsTable tbody tr").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
      // TODO: pan map to coords here, if backend returns lat/lon
    });

    tbody.appendChild(row);
  });
}


function renderBest(events) {
  const bestPanel = document.getElementById("bestPanel");

  if (!events || events.length === 0) {
    bestPanel.style.display = "none";
    return;
  }

  const b = events[0];
  bestPanel.style.display = "block";

  // Build extra info line if data available
  let extras = [];
  if (Number.isFinite(b.distance)) extras.push(`Distance: ${b.distance.toFixed(1)} mi`);
  if (Number.isFinite(b.ticket_price) && b.ticket_price > 0) extras.push(`Ticket: $${b.ticket_price.toFixed(2)}`);
  if (Number.isFinite(b.avg_airbnb)) extras.push(`Airbnb: $${b.avg_airbnb.toFixed(2)}`);
  if (Number.isFinite(b.estimated_total_cost) && b.estimated_total_cost > 0) extras.push(`Total: $${b.estimated_total_cost.toFixed(2)}`);

  bestPanel.innerHTML = `
    <strong>Best Option</strong>
    <div>${escapeHtml(b.name)} — ${escapeHtml(b.city_name)}, ${escapeHtml(b.state)} on ${escapeHtml(b.date)}</div>
    <div>${escapeHtml(extras.join(" • "))}</div>
  `;
}

/* ---------- Handlers for each query button ---------- */

// Q1: Cheapest Airbnb per event (<=1 mile)
document.getElementById("q1Btn").addEventListener("click", async () => {
  const events = await fetchEventsFromEndpoint("/events/cheapest");
  populateTable(events);
  renderBest(events);
});

// Q2: Top cheapest concerts in Illinois
document.getElementById("q2Btn").addEventListener("click", async () => {
  const events = await fetchEventsFromEndpoint("/events/illinois-cheapest");
  populateTable(events);
  renderBest(events);
});

// Q3: Events with most available listings (you didn't have a dedicated endpoint for exactly this; we'll reuse recommendations but you can add new endpoint if desired)
document.getElementById("q3Btn").addEventListener("click", async () => {
  // If you have a special endpoint for query 3, replace with its path. For now use recommendations as a placeholder:
  const events = await fetchEventsFromEndpoint("/events/recommendations");
  populateTable(events);
  renderBest(events);
});

// Q4: Chicago concerts with below-average lodging
document.getElementById("q4Btn").addEventListener("click", async () => {
  const events = await fetchEventsFromEndpoint("/events/chicago-below-avg");
  populateTable(events);
  renderBest(events);
});

/* ---------- keep existing Search & Surprise behavior ---------- */
document.getElementById("searchBtn").addEventListener("click", async () => {
  const q = encodeURIComponent(document.getElementById("searchInput").value.trim());
  const start = document.getElementById("startDate").value; 
  const end = document.getElementById("endDate").value;     
  const maxDist = document.getElementById("distanceRange").value;

  const url = `/events/search?name=${q}&startDate=${start}&endDate=${end}&maxDistance=${maxDist}`;

  const events = await fetchEventsFromEndpoint(url);

  populateTable(events);
  renderBest(events);
});


document.getElementById("surpriseBtn").addEventListener("click", async () => {
  const events = await fetchEventsFromEndpoint("/events/recommendations");
  populateTable(events);
  renderBest(events);
});

/* ---------- Utilities ---------- */

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

const distRange = document.getElementById('distanceRange');
const distVal = document.getElementById('distVal');
if (distRange && distVal) {
  distVal.textContent = distRange.value;
  distRange.addEventListener('input', () => distVal.textContent = distRange.value);
}

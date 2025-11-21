const backendURL = "http://localhost:5000";

async function fetchEventsFromEndpoint(path) {
  const url = `${backendURL}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalizeRow) : [];
  } catch {
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
    date: e.date?.split?.("T")[0] ?? e.date ?? "",
    distance: Number(e.distance ?? 0),
    avg_airbnb: Number(e.price_per_night ?? e.avg_price ?? 0),
    ticket_price: Number(e.ticket_price ?? 0),
    estimated_total_cost: Number(e.estimated_total_cost ?? e.cheapest_total_cost ?? 0),
    num_available_listings: Number(e.num_available_listings ?? 0),
    avg_price_per_night: Number(e.avg_price_per_night ?? 0),
    closest_listing_distance: Number(e.closest_listing_distance ?? 0)
  };
}

/* ---------- Search / Surprise Me table ---------- */
function populateTable(events) {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";
  if (!events.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">No results found</td></tr>`;
    return;
  }
  events.forEach((e, idx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${idx+1}</td>
      <td>${escapeHtml(e.name)}</td>
      <td>${escapeHtml(e.city_name)}, ${escapeHtml(e.state)}</td>
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(e.venue_name)}</td>
      <td style="text-align:right">${e.distance.toFixed(1)}</td>
      <td style="text-align:right">$${e.avg_airbnb.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

/* ---------- Q1–Q4 tables ---------- */
function populateQueryTable(events, tableId) {
  const container = document.getElementById(tableId + "Container");
  if (!container) return;

  // Hide all other Q1–Q4 containers
  document.querySelectorAll(".query-table-container").forEach(div => div.style.display = "none");

  // Show the current one
  container.style.display = "block";

  const table = document.getElementById(tableId);
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  if (!events.length) {
    tbody.innerHTML = `<tr><td colspan="${table.querySelectorAll('th').length}" class="muted">No results found</td></tr>`;
    return;
  }

  events.forEach((e, idx) => {
    const row = document.createElement("tr");
    let html = `
      <td>${idx+1}</td>
      <td>${escapeHtml(e.name)}</td>
      <td>${escapeHtml(e.city_name)}, ${escapeHtml(e.state)}</td>
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(e.venue_name)}</td>
    `;
    if (tableId === "q3Table") {
      html += `
        <td style="text-align:right">${e.num_available_listings}</td>
        <td style="text-align:right">$${e.avg_price_per_night.toFixed(2)}</td>
        <td style="text-align:right">${e.closest_listing_distance.toFixed(1)}</td>
      `;
    } else {
      html += `
        <td style="text-align:right">${e.distance.toFixed(1)}</td>
        <td style="text-align:right">$${e.avg_airbnb.toFixed(2)}</td>
        <td style="text-align:right">$${e.estimated_total_cost.toFixed(2)}</td>
      `;
    }
    row.innerHTML = html;
    tbody.appendChild(row);
  });
}

/* ---------- Search / Surprise Me ---------- */
attachIfExists("searchBtn", async () => {
  const q = encodeURIComponent(document.getElementById("searchInput").value.trim());
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const maxDist = document.getElementById("distanceRange").value;
  const url = `/events/search?name=${q}&startDate=${start}&endDate=${end}&maxDistance=${maxDist}`;
  const events = await fetchEventsFromEndpoint(url);
  populateTable(events);
});

attachIfExists("surpriseBtn", async () => {
  const events = await fetchEventsFromEndpoint("/events/recommendations");
  populateTable(events);
});

/* ---------- Q1–Q4 buttons ---------- */
attachIfExists("q1Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/cheapest");
  populateQueryTable(events, "q1Table");
});
attachIfExists("q2Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/illinois-cheapest");
  populateQueryTable(events, "q2Table");
});
attachIfExists("q3Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/most-availability");
  populateQueryTable(events, "q3Table");
});
attachIfExists("q4Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/chicago-below-avg");
  populateQueryTable(events, "q4Table");
});

/* ---------- Helpers ---------- */
function attachIfExists(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* ---------- Distance UI ---------- */
const distRange = document.getElementById("distanceRange");
const distVal = document.getElementById("distVal");
if (distRange && distVal) {
  distVal.textContent = distRange.value;
  distRange.addEventListener("input", () => (distVal.textContent = distRange.value));
}

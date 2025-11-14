// script.js (updated to match frontend columns)
// backend base URL
const backendURL = "http://localhost:5000";

/**
 * Fetches events from backend REST API
 *
 * Expected/accepted backend field names (we try several aliases):
 *  - event_id
 *  - event_name | name
 *  - venue_name
 *  - city_name | city
 *  - state
 *  - date (ISO string)
 *  - distance_mi | distance | dist_mi
 *  - listing_id | listingId | airbnb_listing_id
 *  - price_per_night | avg_price | avg_airbnb
 */
async function getEvents() {
  try {
    const response = await fetch(`${backendURL}/events/recommendations`);

    if (!response.ok) throw new Error("Backend request failed");

    const data = await response.json();

    return data.map(e => ({
      id: e.event_id ?? e.id ?? null,
      name: e.event_name ?? e.name ?? "",
      venue_name: e.venue_name ?? e.venue ?? "",
      city_name: e.city_name ?? e.city ?? "",
      state: e.state ?? "",
      // Normalize date to YYYY-MM-DD (if ISO string)
      date: (e.date && typeof e.date === 'string' && e.date.split) ? e.date.split("T")[0] : (e.date || ""),
      // distance: try several possible names
      distance: Number(e.distance_mi ?? e.distance ?? e.dist_mi ?? 0),
      // listing id
      listing_id: e.listing_id ?? e.listingId ?? e.airbnb_listing_id ?? "",
      // avg airbnb price
      avg_airbnb: Number(e.price_per_night ?? e.avg_price ?? e.avg_airbnb ?? 0)
    }));
  } catch (err) {
    console.error("error fetching events:", err);
    return [];
  }
}

/**
 * Populate table with returned rows
 * Table columns:
 *  # | Event | City | Date | Venue | Distance (mi) | Airbnb ListingID | Avg Airbnb ($)
 */
function populateTable(events) {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";

  if (!events.length) {
    // colspan = 8 columns
    tbody.innerHTML = `<tr><td colspan="8" class="muted">No results found</td></tr>`;
    return;
  }

  events.forEach((e, idx) => {
    const row = document.createElement("tr");

    // formatting helpers
    const safe = v => (v === null || v === undefined ? "" : v);
    const fmtMoney = n => (Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00");
    const fmtDist = n => (Number.isFinite(n) ? n.toFixed(1) : "0.0");

    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(safe(e.name))}</td>                                      <!-- Event -->
      <td>${escapeHtml(safe(e.city_name))}, ${escapeHtml(safe(e.state))}</td>   <!-- City, State -->
      <td>${escapeHtml(safe(e.date))}</td>                                      <!-- Date -->
      <td>${escapeHtml(safe(e.venue_name))}</td>                                <!-- Venue -->
      <td style="text-align:right">${fmtDist(e.distance)}</td>                  <!-- Distance -->
      <td style="text-align:right">${escapeHtml(safe(e.listing_id))}</td>       <!-- Airbnb ListingID -->
      <td style="text-align:right">${fmtMoney(e.avg_airbnb)}</td>               <!-- Avg Airbnb -->
    `;

    // optional: highlight row on click (for map integration later)
    row.addEventListener("click", () => {
      document.querySelectorAll("#resultsTable tbody tr").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
      // TODO: if backend returns latitude/longitude, pan map to coords here
    });

    tbody.appendChild(row);
  });
}

/**
 * Display best (recommended) event
 * We treat the first event in `events` as the best.
 */
function renderBest(events) {
  const bestPanel = document.getElementById("bestPanel");

  if (!events.length) {
    bestPanel.style.display = "none";
    return;
  }

  const best = events[0];

  bestPanel.style.display = "block";
  bestPanel.innerHTML = `
    <strong>Best Option</strong>
    <div>${escapeHtml(best.name)} — ${escapeHtml(best.city_name)}, ${escapeHtml(best.state)} on ${escapeHtml(best.date)}</div>
    <div>
      Distance: ${Number(best.distance).toFixed(1)} mi • 
      Airbnb listing: ${escapeHtml(best.listing_id)} • 
      Avg Airbnb: ${best.avg_airbnb !== undefined ? `$${best.avg_airbnb.toFixed(2)}` : '$0.00'}
    </div>
  `;
}

/**
 * Search button handler
 */
document.getElementById("searchBtn").addEventListener("click", async () => {
  // (optional) read filters and pass as query params in future
  const events = await getEvents();
  populateTable(events);
  renderBest(events);
});

/**
 * Surprise button handler
 */
document.getElementById("surpriseBtn").addEventListener("click", async () => {
  const events = await getEvents();
  populateTable(events);
  renderBest(events);
});

/* ---------- Utilities ---------- */

// Basic HTML escape to avoid insertion issues
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// Initialize distance range display if present
const distRange = document.getElementById('distanceRange');
const distVal = document.getElementById('distVal');
if (distRange && distVal) {
  distVal.textContent = distRange.value;
  distRange.addEventListener('input', () => distVal.textContent = distRange.value);
}
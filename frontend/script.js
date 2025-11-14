// script.js (updated to match frontend columns)
// backend base URL
const backendURL = "http://localhost:5000";

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
      date: (e.date && typeof e.date === 'string' && e.date.split) ? e.date.split("T")[0] : (e.date || ""),
      distance: Number(e.distance_mi ?? e.distance ?? e.dist_mi ?? 0),
      avg_airbnb: Number(e.price_per_night ?? e.avg_price ?? e.avg_airbnb ?? 0)
    }));
  } catch (err) {
    console.error("error fetching events:", err);
    return [];
  }
}

function populateTable(events) {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";

  if (!events.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">No results found</td></tr>`;
    return;
  }

  events.forEach((e, idx) => {
    const row = document.createElement("tr");

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
      <td style="text-align:right">${fmtMoney(e.avg_airbnb)}</td>               <!-- Avg Airbnb -->
    `;


    row.addEventListener("click", () => {
      document.querySelectorAll("#resultsTable tbody tr").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
      // TODO: pan map to coords here
    });

    tbody.appendChild(row);
  });
}

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
      Avg Airbnb: ${best.avg_airbnb !== undefined ? `$${best.avg_airbnb.toFixed(2)}` : '$0.00'}
    </div>
  `;
}

/**
 * Search button handler
 */
document.getElementById("searchBtn").addEventListener("click", async () => {
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

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

const distRange = document.getElementById('distanceRange');
const distVal = document.getElementById('distVal');
if (distRange && distVal) {
  distVal.textContent = distRange.value;
  distRange.addEventListener('input', () => distVal.textContent = distRange.value);
}
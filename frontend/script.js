// ================================================
// ✅ FINAL WORKING script.js
// ================================================

// Change this to your backend URL if deployed
const backendURL = "http://localhost:5000";

/**
 * Fetches events from backend REST API
 */
async function getEvents() {
  try {
    const response = await fetch(`${backendURL}/events/recommendations`);

    if (!response.ok) throw new Error("Backend request failed");

    const data = await response.json();

    return data.map(e => ({
      id: e.event_id,
      name: e.event_name,
      venue_name: e.venue_name || "",
      city_name: e.city_name,
      state: e.state,
      date: e.date?.split("T")[0] || "",
      ticket_price: Number(e.ticket_price) || 0,
      avg_airbnb: Number(e.price_per_night) || 0,
      total_cost: Number(e.estimated_total_cost) || 0
    }));
  } catch (err) {
    console.error("error fetching events:", err);
    return [];
  }
}

/**
 * Populate table with returned rows
 */
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
      <td>${idx + 1}</td>
      <td>${e.city_name}, ${e.state}</td>
      <td>${e.date}</td>
      <td>${e.venue_name}</td>
      <td>$${e.ticket_price.toFixed(2)}</td>
      <td>$${e.avg_airbnb.toFixed(2)}</td>
      <td><strong>$${e.total_cost.toFixed(2)}</strong></td>
    `;

    tbody.appendChild(row);
  });
}

/**
 * Display best (cheapest) event
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
    <div>${best.name} — ${best.city_name}, ${best.state} on ${best.date}</div>
    <div>
      Ticket: $${best.ticket_price.toFixed(2)} • 
      Airbnb: $${best.avg_airbnb.toFixed(2)} • 
      <strong>Total: $${best.total_cost.toFixed(2)}</strong>
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

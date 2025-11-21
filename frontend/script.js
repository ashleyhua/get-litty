// script.js — updated (includes map init on DOMContentLoaded, extra logs, and invalidateSize fix)
// ADDED comments mark the small fixes for Leaflet/map reliability and debugging.

//
// Backend base URL
//
const backendURL = "http://localhost:5000";

/* ---------------- Generic fetch + normalizer ---------------- */
async function fetchEventsFromEndpoint(path, shouldNormalize = true) {
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
    return shouldNormalize ? data.map(normalizeRow) : data;
  } catch (err) {
    console.error("[fetch] error", err);
    return [];
  }
}

/**
 * Normalize a DB row into the format the frontend expects:
 * { id, name, venue_name, city_name, state, date, distance, avg_airbnb, ticket_price, estimated_total_cost, venue_lat, venue_lng }
 */
function normalizeRow(e) {
  return {
    id: e.event_id ?? e.id ?? null,
    name: e.event_name ?? e.name ?? "",
    venue_name: e.venue_name ?? e.venue ?? "",
    city_name: e.city_name ?? e.city ?? "",
    state: e.state ?? "",
    date:
      e.date && typeof e.date === "string" && e.date.split
        ? e.date.split("T")[0]
        : e.date || "",
    distance: Number(e.distance ?? e.distance_mi ?? e.dist_mi ?? 0),
    avg_airbnb: Number(e.price_per_night ?? e.avg_price ?? e.avg_airbnb ?? 0),
    ticket_price: Number(e.ticket_price ?? e.price ?? 0),
    estimated_total_cost: Number(e.estimated_total_cost ?? e.cheapest_total_cost ?? 0),
    // venue coords (if server returned them)
    venue_lat:
      e.venue_lat !== undefined && e.venue_lat !== null && !Number.isNaN(Number(e.venue_lat))
        ? Number(e.venue_lat)
        : NaN,
    venue_lng:
      e.venue_lng !== undefined && e.venue_lng !== null && !Number.isNaN(Number(e.venue_lng))
        ? Number(e.venue_lng)
        : NaN
  };
}

/* ---------------- Table rendering ---------------- */
function populateTable(events, queryType = 'default') {
  const tbody = document.querySelector("#resultsTable tbody");
  const thead = document.querySelector("#resultsTable thead tr");
  tbody.innerHTML = "";

  if (!events || !events.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="muted">No results found</td></tr>`;
    return;
  }

  const safe = v => (v === null || v === undefined ? "" : v);
  const fmtMoney = n => (Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00");
  const fmtDist = n => (Number.isFinite(n) ? n.toFixed(1) : "0.0");

  // Query 1: Cheapest per event
  if (queryType === 'q1') {
    thead.innerHTML = `
      <th>#</th>
      <th>Event</th>
      <th>City</th>
      <th>State</th>
      <th>Cheapest Total Cost</th>
    `;
    
    events.forEach((e, idx) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(safe(e.event_name))}</td>
        <td>${escapeHtml(safe(e.city_name))}</td>
        <td>${escapeHtml(safe(e.state))}</td>
        <td style="text-align:right">${fmtMoney(e.cheapest_total_cost)}</td>
      `;
      tbody.appendChild(row);
    });
  }
  
  // Query 2: Illinois cheapest
  else if (queryType === 'q2') {
    thead.innerHTML = `
      <th>#</th>
      <th>Event</th>
      <th>City</th>
      <th>State</th>
      <th>Date</th>
      <th>Cheapest Total Cost</th>
    `;
    
    events.forEach((e, idx) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(safe(e.event_name))}</td>
        <td>${escapeHtml(safe(e.city_name))}</td>
        <td>${escapeHtml(safe(e.state))}</td>
        <td>${escapeHtml(safe(e.date))}</td>
        <td style="text-align:right">${fmtMoney(e.cheapest_total_cost)}</td>
      `;
      tbody.appendChild(row);
    });
  }
  
  // Query 3: Most availability
  else if (queryType === 'q3') {
    thead.innerHTML = `
      <th>#</th>
      <th>Event</th>
      <th>City</th>
      <th>State</th>
      <th>Available Listings</th>
      <th>Avg Price/Night</th>
      <th>Closest Distance (mi)</th>
    `;
    
    events.forEach((e, idx) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(safe(e.event_name))}</td>
        <td>${escapeHtml(safe(e.city_name))}</td>
        <td>${escapeHtml(safe(e.state))}</td>
        <td style="text-align:right">${safe(e.num_available_listings)}</td>
        <td style="text-align:right">${fmtMoney(e.avg_price_per_night)}</td>
        <td style="text-align:right">${fmtDist(e.closest_listing_distance)}</td>
      `;
      tbody.appendChild(row);
    });
  }
  
  // Query 4: Chicago below avg
  else if (queryType === 'q4') {
    thead.innerHTML = `
      <th>#</th>
      <th>Event</th>
      <th>City</th>
      <th>State</th>
      <th>Date</th>
      <th>Cheapest Airbnb Price</th>
    `;
    
    events.forEach((e, idx) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(safe(e.event_name))}</td>
        <td>${escapeHtml(safe(e.city_name))}</td>
        <td>${escapeHtml(safe(e.state))}</td>
        <td>${escapeHtml(safe(e.date))}</td>
        <td style="text-align:right">${fmtMoney(e.cheapest_airbnb_price)}</td>
      `;
      tbody.appendChild(row);
    });
  }
  
  // Default: Search & Surprise Me
  else {
    thead.innerHTML = `
      <th>#</th>
      <th>Event</th>
      <th>City</th>
      <th>Date</th>
      <th>Venue</th>
      <th>Distance (mi)</th>
      <th>Avg Airbnb ($)</th>
      <th>Total Cost ($)</th>
    `;
    
    events.forEach((e, idx) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(safe(e.event_name || e.name))}</td>
        <td>${escapeHtml(safe(e.city_name))}, ${escapeHtml(safe(e.state))}</td>
        <td>${escapeHtml(safe(e.date))}</td>
        <td>${escapeHtml(safe(e.venue_name))}</td>
        <td style="text-align:right">${fmtDist(e.distance)}</td>
        <td style="text-align:right">${fmtMoney(e.avg_airbnb)}</td>
        <td style="text-align:right">${fmtMoney(e.estimated_total_cost)}</td>
      `;
      tbody.appendChild(row);
    });
  }
}

function renderBest(events) {
  const bestPanel = document.getElementById("bestPanel");

  if (!events || events.length === 0) {
    bestPanel.style.display = "none";
    return;
  }

  const b = events[0];
  bestPanel.style.display = "block";

  // Handle both normalized (search/surprise) and raw (q1-q4) data
  const eventName = b.name || b.event_name || "";
  const cityName = b.city_name || "";
  const state = b.state || "";
  const date = b.date ? (typeof b.date === "string" ? b.date.split("T")[0] : b.date) : "";

  let extras = [];
  const distance = Number(b.distance ?? b.closest_listing_distance ?? 0);
  const ticketPrice = Number(b.ticket_price ?? 0);
  const airbnbPrice = Number(b.avg_airbnb ?? b.avg_price_per_night ?? b.cheapest_airbnb_price ?? 0);
  const totalCost = Number(b.estimated_total_cost ?? b.cheapest_total_cost ?? 0);

  if (Number.isFinite(distance) && distance > 0) extras.push(`Distance: ${distance.toFixed(1)} mi`);
  if (Number.isFinite(ticketPrice) && ticketPrice > 0) extras.push(`Ticket: $${ticketPrice.toFixed(2)}`);
  if (Number.isFinite(airbnbPrice) && airbnbPrice > 0) extras.push(`Airbnb: $${airbnbPrice.toFixed(2)}`);
  if (Number.isFinite(totalCost) && totalCost > 0) extras.push(`Total: $${totalCost.toFixed(2)}`);

  bestPanel.innerHTML = `
    <strong>Best Option</strong>
    <div>${escapeHtml(eventName)} — ${escapeHtml(cityName)}, ${escapeHtml(state)} on ${escapeHtml(date)}</div>
    <div>${escapeHtml(extras.join(" • "))}</div>
  `;
}

/* ---------- Safe attach helper ---------- */
function attachIfExists(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", handler);
}

/* ---------- Query buttons ---------- */
attachIfExists("q1Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/cheapest", false); // Don't normalize
  populateTable(events, 'q1');
  renderBest(events);
  clearMapMarkers();
});

attachIfExists("q2Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/illinois-cheapest", false); // Don't normalize
  populateTable(events, 'q2');
  renderBest(events);
  clearMapMarkers();
});

attachIfExists("q3Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/most-availability", false); // Don't normalize
  populateTable(events, 'q3');
  renderBest(events);
  clearMapMarkers();
});

attachIfExists("q4Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/chicago-below-avg", false); // Don't normalize
  populateTable(events, 'q4');
  renderBest(events);
  clearMapMarkers();
});

/* ---------- Search & Surprise (these DO normalize) ---------- */
attachIfExists("searchBtn", async () => {
  const q = encodeURIComponent(document.getElementById("searchInput").value.trim());
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const maxDist = document.getElementById("distanceRange").value;

  const url = `/events/search?name=${q}&startDate=${start}&endDate=${end}&maxDistance=${maxDist}`;
  const events = await fetchEventsFromEndpoint(url, true); // Normalize
  populateTable(events, 'default');
  renderBest(events);
  
  // Show map ONLY for search results
  if (events && events.length > 0) {
    fetchAndShowTopListingsForEvent(events[0]);
  }
});

attachIfExists("surpriseBtn", async () => {
  const events = await fetchEventsFromEndpoint("/events/recommendations", true); // Normalize
  populateTable(events, 'default');
  renderBest(events);
  clearMapMarkers();
});

/* ---------------- Map / Leaflet integration ---------------- */
let map = null;
let markersLayer = null;

/**
 * Initialize map if Leaflet is available
 * ADDED: console logs for debugging
 */
function initMapIfNeeded() {
  if (map) return;
  if (typeof L === "undefined") {
    console.warn("Leaflet (L) not found. Make sure leaflet.js is loaded before script.js");
    return;
  }
  console.log("[map] creating map");
  map = L.map("map", { zoomControl: true });
  map.setView([39.5, -98.35], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  console.log("[map] created with tile layer and markers layer");
}

/**
 * Clear all markers
 */
function clearMapMarkers() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
}

/**
 * Show top listings on the Leaflet map and fit bounds.
 * ADDED: call invalidateSize() shortly after fitBounds to ensure tiles/markers render properly.
 */
function showTopListingsOnMap(listings = [], venueLatLng = null) {
  initMapIfNeeded();
  if (!map) return;
  clearMapMarkers();

  const bounds = [];

  listings.forEach(l => {
    const lat = Number(l.latitude);
    const lng = Number(l.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const popup = `
      <div>
        <strong>Listing ${escapeHtml(String(l.listing_id))}</strong><br/>
        Price/night: $${Number(l.price_per_night).toFixed(2)}<br/>
        Distance: ${Number(l.distance).toFixed(2)} mi<br/>
        Total: $${Number(l.total_cost).toFixed(2)}
      </div>
    `;
    const m = L.marker([lat, lng]).bindPopup(popup);
    markersLayer.addLayer(m);
    bounds.push([lat, lng]);
  });

  if (venueLatLng && Number.isFinite(venueLatLng[0]) && Number.isFinite(venueLatLng[1])) {
    bounds.push(venueLatLng);
    const venueMarker = L.circleMarker(venueLatLng, { radius: 7, color: "#1a73e8" }).bindPopup("<strong>Venue</strong>");
    markersLayer.addLayer(venueMarker);
  }

  if (bounds.length) {
    try {
      map.fitBounds(bounds, { padding: [40, 40] });
    } catch (err) {
      console.warn("[map] fitBounds error", err);
    }
  } else if (venueLatLng) {
    map.setView(venueLatLng, 12);
  }

  // ADDED: invalidateSize after a short timeout to fix rendering when the container has changed
  if (map && typeof map.invalidateSize === "function") {
    setTimeout(() => {
      try {
        map.invalidateSize();
        console.log("[map] invalidateSize called");
      } catch (err) {
        console.warn("[map] invalidateSize error:", err);
      }
    }, 150);
  }
}

/* Fetch top-5 listings for the given normalized event object and show on map */
async function fetchAndShowTopListingsForEvent(eventObj) {
  if (!eventObj || !eventObj.id) return;
  try {
    // ensure map is initialized (ADDED)
    initMapIfNeeded();

    const url = `${backendURL}/events/${eventObj.id}/top-listings`;
    console.log("[map] fetch", url);
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[map] fetch failed", res.status);
      return;
    }
    const listings = await res.json();

    // map the returned listing rows to the expected shape (defensive)
    const normalizedListings = (Array.isArray(listings) ? listings : []).map(l => ({
      listing_id: l.listing_id ?? l.id ?? "",
      latitude: Number(l.latitude ?? l.lat ?? l.lat_dd ?? NaN),
      longitude: Number(l.longitude ?? l.lng ?? l.lon ?? NaN),
      price_per_night: Number(l.price_per_night ?? l.price ?? 0),
      distance: Number(l.distance ?? l.distance_mi ?? 0),
      total_cost: Number(l.total_cost ?? 0)
    }));

    const venueLatLng = Number.isFinite(eventObj.venue_lat) && Number.isFinite(eventObj.venue_lng)
      ? [eventObj.venue_lat, eventObj.venue_lng]
      : null;

    showTopListingsOnMap(normalizedListings, venueLatLng);
  } catch (err) {
    console.error("[map] error", err);
  }
}

/* ---------- Utilities ---------- */
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* keep distance UI in sync */
const distRange = document.getElementById("distanceRange");
const distVal = document.getElementById("distVal");
if (distRange && distVal) {
  distVal.textContent = distRange.value;
  distRange.addEventListener("input", () => (distVal.textContent = distRange.value));
}

/* ---------------- ADDED: init map as soon as DOM is ready (fix timing issues) ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  try {
    initMapIfNeeded();
    console.log("[map] DOM loaded — initMapIfNeeded called");
  } catch (err) {
    console.error("[map] DOMContentLoaded init error", err);
  }
});

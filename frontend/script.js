const backendURL = "http://localhost:5000";

// Fetches Events from Endpoints
async function fetchEventsFromEndpoint(path, shouldNormalize = true) {
  const url = `${backendURL}${path}`;
  console.log("[fetch] GET", url);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }
    if (shouldNormalize) {
      return data.map(normalizeRow);
    }
    return data;
  } catch (err) {
    return [];
  }
}

// Maps database data to columns on the frontend
function normalizeRow(e) {
  const out = {
    event_id: e.event_id,
    name: e.name ?? e.event_name ?? "",
    event_name: e.event_name ?? e.name ?? "",
    venue_name: e.venue_name,
    city_name: e.city_name,
    state: e.state,
    date: "",
    distance: Number(e.distance || 0),
    price_per_night: Number(e.price_per_night ?? e.avg_price_per_night ?? e.avg_airbnb ?? 0),
    ticket_price: Number(e.ticket_price || 0),
    estimated_total_cost: Number(e.estimated_total_cost || 0),
    cheapest_total_cost: Number(e.cheapest_total_cost || 0),
    num_available_listings: Number(e.num_available_listings || 0),
    closest_listing_distance: Number(e.closest_listing_distance || 0),
    cheapest_airbnb_price: Number(e.cheapest_airbnb_price || 0),
    listing_id: e.listing_id,
    latitude: Number(e.latitude),
    longitude: Number(e.longitude)
  };

  if (e.date && typeof e.date === "string" && e.date.split) {
    out.date = e.date.split("T")[0];
  } else {
    out.date = e.date || "";
  }

  return out;
}

// Table Rendering
function populateTable(events, queryType = 'default') {
  const tbody = document.querySelector("#resultsTable tbody");
  const thead = document.querySelector("#resultsTable thead tr");
  tbody.innerHTML = "";

  if (!events || !events.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="muted">No results found</td></tr>`;
    return;
  }

  const safe = function(v) {
    if (v === null || v === undefined) {
      return "";
    }
    return v;
  };

  const fmtMoney = function(n) {
    if (Number.isFinite(Number(n))) {
      return `$${Number(Number(n)).toFixed(2)}`;
    }
    return "$0.00";
  };

  const fmtDist = function(n) {
    if (Number.isFinite(Number(n))) {
      return Number(Number(n)).toFixed(1);
    }
    return "0.0";
  };

  const fmtDate = function(d) {
    if (!d) {
      return "";
    }
    if (typeof d === "string" && d.includes("T")) {
      return d.split("T")[0];
    }
    return d;
  };

  // Query 1
  if (queryType === 'q1') {
    thead.innerHTML = `
      <th>Event ID</th>
      <th>Event</th>
      <th>City</th>
      <th>State</th>
      <th>Cheapest Total Cost</th>
    `;

    events.forEach((e, idx) => {
      const cost = e.cheapest_total_cost ?? e.estimated_total_cost ?? 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${e.event_id ?? e.id ?? ''}</td>
        <td>${escapeHtml(safe(e.event_name ?? e.name))}</td>
        <td>${escapeHtml(safe(e.city_name ?? e.city))}</td>
        <td>${escapeHtml(safe(e.state))}</td>
        <td style="text-align:right">${fmtMoney(cost)}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Query 2
  else if (queryType === 'q2') {
    thead.innerHTML = `
      <th>Event ID</th>
      <th>Listing ID</th>
      <th>Event</th>
      <th>City</th>
      <th>State</th>
      <th>Date</th>
      <th>Cheapest Total Cost</th>
    `;

    events.forEach((e, idx) => {
      const cost = e.cheapest_total_cost ?? e.estimated_total_cost ?? 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${e.event_id ?? e.id ?? ''}</td>
        <td>${e.listing_id ?? ''}</td>
        <td>${escapeHtml(safe(e.event_name ?? e.name))}</td>
        <td>${escapeHtml(safe(e.city_name ?? e.city))}</td>
        <td>${escapeHtml(safe(e.state))}</td>
        <td>${escapeHtml(fmtDate(e.date))}</td>
        <td style="text-align:right">${fmtMoney(cost)}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Query 3
  else if (queryType === 'q3') {
    thead.innerHTML = `
      <th>Event ID</th>
      <th>Event</th>
      <th>City</th>
      <th>State</th>
      <th>Available Listings</th>
      <th>Avg Price/Night</th>
      <th>Closest Distance (mi)</th>
    `;

    events.forEach((e, idx) => {
      const num = e.num_available_listings ?? e.count ?? 0;
      const avg = e.avg_price_per_night ?? e.avg_airbnb ?? e.avg_price ?? 0;
      const closest = e.closest_listing_distance ?? e.min_distance ?? e.distance ?? 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${e.event_id ?? e.id ?? ''}</td>
        <td>${escapeHtml(safe(e.event_name ?? e.name))}</td>
        <td>${escapeHtml(safe(e.city_name ?? e.city))}</td>
        <td>${escapeHtml(safe(e.state))}</td>
        <td style="text-align:right">${safe(num)}</td>
        <td style="text-align:right">${fmtMoney(avg)}</td>
        <td style="text-align:right">${fmtDist(closest)}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Query 4
  else if (queryType === 'q4') {
    thead.innerHTML = `
      <th>Event ID</th>
      <th>Listing ID</th>
      <th>Event</th>
      <th>City</th>
      <th>State</th>
      <th>Date</th>
      <th>Cheapest Airbnb Price</th>
    `;

    events.forEach((e, idx) => {
      const price = e.cheapest_airbnb_price ?? e.min_price_per_night ?? e.avg_airbnb ?? 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${e.event_id ?? e.id ?? ''}</td>
        <td>${e.listing_id ?? ''}</td>
        <td>${escapeHtml(safe(e.event_name ?? e.name))}</td>
        <td>${escapeHtml(safe(e.city_name ?? e.city))}</td>
        <td>${escapeHtml(safe(e.state))}</td>
        <td>${escapeHtml(fmtDate(e.date))}</td>
        <td style="text-align:right">${fmtMoney(price)}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Search & Surprise Me
  else {
    thead.innerHTML = `
      <th>Event ID</th>
      <th>Listing ID</th>
      <th>Event</th>
      <th>City</th>
      <th>Date</th>
      <th>Venue</th>
      <th>Distance (mi)</th>
      <th>Airbnb ($)</th>
    `;

    events.forEach((e, idx) => {
      const eventName = e.event_name ?? e.name ?? "";
      const city = e.city_name ?? e.city ?? "";
      const state = e.state ?? "";
      const date = e.date ?? "";
      const venue = e.venue_name ?? e.venue ?? "";
      const distance = Number(e.distance ?? e.distance_mi ?? 0);
      const avgAirbnb = Number(e.avg_airbnb ?? e.price_per_night ?? 0);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${e.event_id ?? e.id ?? ''}</td>
        <td>${e.listing_id ?? ''}</td>
        <td>${escapeHtml(safe(eventName))}</td>
        <td>${escapeHtml(safe(city))}, ${escapeHtml(safe(state))}</td>
        <td>${escapeHtml(safe(date))}</td>
        <td>${escapeHtml(safe(venue))}</td>
        <td style="text-align:right">${fmtDist(distance)}</td>
        <td style="text-align:right">${fmtMoney(avgAirbnb)}</td>
      `;
      tbody.appendChild(row);
    });
  }
}

// Rendering the best panel
function renderBest(events, mode = 'search') {
  const bestPanel = document.getElementById("bestPanel");

  if (!events || events.length === 0) {
    bestPanel.style.display = "none";
    return;
  }

  const b = events[0];
  bestPanel.style.display = "block";

  const eventName = b.name ?? b.event_name ?? "";
  const cityName = b.city_name ?? b.city ?? "";
  const state = b.state ?? "";
  const date = b.date ? (typeof b.date === "string" ? b.date.split("T")[0] : b.date) : "";
  const venueName = b.venue_name ?? b.venue ?? "";

  if (mode === 'surprise') {
    bestPanel.innerHTML = `
      <strong>You should attend...</strong>
      <div>Event ID: ${escapeHtml(String(b.event_id ?? b.id ?? ''))}</div>
      <div>${escapeHtml(eventName)}</div>
      <div>${escapeHtml(date)}</div>
      <div>${escapeHtml(venueName)}</div>
    `;
  } else {
    let extras = [];
    const distance = Number(b.distance ?? b.closest_listing_distance ?? 0);
    const airbnbPrice = Number(b.avg_airbnb ?? b.avg_price_per_night ?? b.cheapest_airbnb_price ?? 0);

    if (Number.isFinite(distance) && distance > 0) extras.push(`Distance: ${distance.toFixed(1)} mi`);
    if (Number.isFinite(airbnbPrice) && airbnbPrice > 0) extras.push(`Airbnb: $${airbnbPrice.toFixed(2)}`);

    bestPanel.innerHTML = `
      <strong>Best Option</strong>
      <div>${escapeHtml(eventName)} — ${escapeHtml(cityName)}, ${escapeHtml(state)} on ${escapeHtml(date)}</div>
      <div>${escapeHtml(extras.join(" • "))}</div>
    `;
  }
}

function hideBestPanel() {
  const bestPanel = document.getElementById("bestPanel");
  if (bestPanel) {
    bestPanel.style.display = "none";
  }
}


function attachIfExists(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", handler);
}

// Query Buttons
attachIfExists("q1Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/cheapest", false);
  populateTable(events, 'q1');
  clearMapMarkers();
  hideBestPanel();
});

attachIfExists("q2Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/illinois-cheapest", false);
  populateTable(events, 'q2');
  clearMapMarkers();
  hideBestPanel();
});

attachIfExists("q3Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/most-availability", false);
  populateTable(events, 'q3');
  clearMapMarkers();
  hideBestPanel();
});

attachIfExists("q4Btn", async () => {
  const events = await fetchEventsFromEndpoint("/events/chicago-below-avg", false);
  populateTable(events, 'q4');
  clearMapMarkers();
  hideBestPanel();
});

// Search and Surpise Buttons
attachIfExists("searchBtn", async () => {
  const q = document.getElementById("searchInput").value.trim();
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const maxDist = document.getElementById("distanceRange").value;

  const url = `/events/search?name=${encodeURIComponent(q)}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&maxDistance=${encodeURIComponent(maxDist)}`;
  const events = await fetchEventsFromEndpoint(url, true);

  populateTable(events, 'default');
  renderBest(events, 'search');

  if (events && events.length > 0) {
    const bestEvent = events[0];
    const eventId = bestEvent.event_id ?? bestEvent.id;
    
    console.log("[search] fetching top 5 listings for event:", eventId, "within", maxDist, "miles");
    
    try {
      const res = await fetch(`${backendURL}/events/${eventId}/top-listings?maxDistance=${maxDist}`);
      
      if (res.ok) {
        const listings = await res.json();
        console.log("[search] got listings:", listings);
        
        const venueLat = Number(bestEvent.venue_lat ?? bestEvent.latitude ?? NaN);
        const venueLng = Number(bestEvent.venue_lng ?? bestEvent.longitude ?? NaN);
        const venueLatLng = Number.isFinite(venueLat) && Number.isFinite(venueLng) ? [venueLat, venueLng] : null;
        
        showTopListingsOnMap(listings, venueLatLng);
      } 
    } catch (err) {
      console.error("[search] error fetching listings for map:", err);
    }
  }
});

attachIfExists("surpriseBtn", async () => {
  const events = await fetchEventsFromEndpoint("/events/random", true);
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";
  renderBest(events, 'surprise');
  clearMapMarkers();
});

// Leaflet Stuff
let map = null;
let markersLayer = null;

function initMapIfNeeded() {
  if (map) return;
  if (typeof L === "undefined") {
    return;
  }
  map = L.map("map", { zoomControl: true });
  map.setView([39.5, -98.35], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function clearMapMarkers() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
}

function showTopListingsOnMap(listings = [], venueLatLng = null) {
  initMapIfNeeded();
  if (!map) return;
  clearMapMarkers();

  console.log("[map] called with:", listings);
  console.log("[map] venue coords:", venueLatLng);

  const bounds = [];

  listings.forEach((l, index) => {
    const lat = parseFloat(l.latitude ?? l.lat ?? l.lat_dd ?? l.latitude_dd ?? NaN);
    const lng = parseFloat(l.longitude ?? l.lng ?? l.lon ?? l.longitude_dd ?? NaN);
    
    console.log(`[map] listing ${index} coords: lat=${lat}, lng=${lng}`);
    
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const popup = `
      <div>
        <strong>Listing ${escapeHtml(String(l.listing_id ?? l.id ?? ""))}</strong><br/>
        Price/night: $${parseFloat(l.price_per_night ?? l.price ?? 0).toFixed(2)}<br/>
        Distance: ${parseFloat(l.distance ?? 0).toFixed(2)} mi<br/>
        Total: $${parseFloat(l.total_cost ?? 0).toFixed(2)}
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

// Fetch top-5 listings for the given event and show on map
async function fetchAndShowTopListingsForEvent(eventObj) {
  if (!eventObj) return;

  const id = eventObj.id ?? eventObj.event_id ?? null;
  if (!id) return;

  try {
    initMapIfNeeded();

    const url = `${backendURL}/events/${id}/top-listings`;
    console.log("[map] fetch", url);
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[map] fetch failed", res.status);
      return;
    }
    const listings = await res.json();

    const normalizedListings = (Array.isArray(listings) ? listings : []).map(l => ({
      listing_id: l.listing_id ?? l.id ?? "",
      latitude: Number(l.latitude ?? l.lat ?? l.lat_dd ?? NaN),
      longitude: Number(l.longitude ?? l.lng ?? l.lon ?? NaN),
      price_per_night: Number(l.price_per_night ?? l.price ?? 0),
      distance: Number(l.distance ?? l.distance_mi ?? 0),
      total_cost: Number(l.total_cost ?? 0)
    }));

    const venueLat = Number(eventObj.venue_lat ?? eventObj.latitude ?? NaN);
    const venueLng = Number(eventObj.venue_lng ?? eventObj.longitude ?? NaN);
    const venueLatLng = Number.isFinite(venueLat) && Number.isFinite(venueLng) ? [venueLat, venueLng] : null;

    showTopListingsOnMap(normalizedListings, venueLatLng);
  } catch (err) {
    console.error("[map] error", err);
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

const distRange = document.getElementById("distanceRange");
const distVal = document.getElementById("distVal");
if (distRange && distVal) {
  distVal.textContent = distRange.value;
  distRange.addEventListener("input", () => (distVal.textContent = distRange.value));
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    initMapIfNeeded();
    console.log("[map] DOM loaded — initMapIfNeeded called");
  } catch (err) {
    console.error("[map] DOMContentLoaded init error", err);
  }
});

// WantsToAttend Buttons
const USER_ID = 1;

attachIfExists("addEventBtn", async () => {
  const eventId = document.getElementById("addEventId").value.trim();
  const messageEl = document.getElementById("addEventMessage");
  
  if (!eventId) {
    showMessage(messageEl, "Please enter an Event ID", "error");
    return;
  }

  try {
    const res = await fetch(`${backendURL}/user/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID, eventId: parseInt(eventId) })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(messageEl, data.error || "Failed to add event", "error");
      return;
    }

    showMessage(messageEl, "Event added successfully! 🎉", "success");
    document.getElementById("addEventId").value = "";
    
    const listEl = document.getElementById("myEventsList");
    if (listEl.innerHTML) {
      document.getElementById("viewEventsBtn").click();
    }
  } catch (err) {
    console.error("Error adding event:", err);
    showMessage(messageEl, "Network error. Please try again.", "error");
  }
});


attachIfExists("viewEventsBtn", async () => {
  const listEl = document.getElementById("myEventsList");
  const countEl = document.getElementById("eventCount");
  
  listEl.innerHTML = "<p>Loading...</p>";
  countEl.style.display = "none";

  try {
    const res = await fetch(`${backendURL}/user/${USER_ID}/events`);
    
    if (!res.ok) {
      listEl.innerHTML = "<p class='error'>Failed to load events</p>";
      return;
    }

    const events = await res.json();

    if (!events || events.length === 0) {
      listEl.innerHTML = "<p class='muted'>You haven't added any events yet.</p>";
      updateEventCount();
      return;
    }

    const count = events.length;
    countEl.textContent = `You have ${count} event${count !== 1 ? "s" : ""} scheduled`;
    countEl.style.display = "block";
    listEl.innerHTML = events.map(e => {
      const housingStatus = e.Housing_Confirmed === 'Y' ? '✓ Confirmed' : '✗ Not Confirmed';
      const housingClass = e.Housing_Confirmed === 'Y' ? 'confirmed' : 'not-confirmed';
      
      return `
        <div class="event-item">
          <strong>${escapeHtml(e.event_name)}</strong>
          <div class="event-details">
            Event ID: ${e.event_id} | 
            ${escapeHtml(e.city_name)}, ${escapeHtml(e.state)} | 
            ${e.date ? e.date.split('T')[0] : 'No date'} | 
            ${e.venue_name ? escapeHtml(e.venue_name) : 'No venue'} | 
            <span class="${housingClass}">Housing: ${housingStatus}</span>
          </div>
        </div>
      `;
    }).join("");

    updateEventCount();
  } catch (err) {
    console.error("Error fetching events:", err);
    listEl.innerHTML = "<p class='error'>Network error. Please try again.</p>";
    updateEventCount();
  }
});

attachIfExists("removeEventBtn", async () => {
  const eventId = document.getElementById("removeEventId").value.trim();
  const messageEl = document.getElementById("removeEventMessage");
  
  if (!eventId) {
    showMessage(messageEl, "Please enter an Event ID", "error");
    return;
  }

  try {
    const res = await fetch(`${backendURL}/user/events`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID, eventId: parseInt(eventId) })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(messageEl, data.error || "Failed to remove event", "error");
      return;
    }

    showMessage(messageEl, "Event removed successfully ✓", "success");
    document.getElementById("removeEventId").value = "";
    
    const listEl = document.getElementById("myEventsList");
    if (listEl.innerHTML) {
      document.getElementById("viewEventsBtn").click();
    }
  } catch (err) {
    console.error("Error removing event:", err);
    showMessage(messageEl, "Network error. Please try again.", "error");
  }
});

attachIfExists("bulkAddCityBtn", async () => {
  const cityName = document.getElementById("bulkCityName").value.trim();
  const messageEl = document.getElementById("bulkAddMessage");
  
  if (!cityName) {
    showMessage(messageEl, "Please enter a city name", "error");
    return;
  }

  try {
    const res = await fetch(`${backendURL}/user/events/bulk-add-city`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID, cityName })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(messageEl, data.error || "Failed to add events", "error");
      
      if (data.skippedEvents) {
        console.log("Skipped events:", data.skippedEvents);
      }
      return;
    }

    let msg = `✓ Added ${data.addedCount} event(s)`;
    if (data.skippedCount > 0) {
      msg += ` (skipped ${data.skippedCount})`;
    }
    
    showMessage(messageEl, msg, "success");
    document.getElementById("bulkCityName").value = "";
    
    const listEl = document.getElementById("myEventsList");
    if (listEl.innerHTML) {
      document.getElementById("viewEventsBtn").click();
    }
  } catch (err) {
    console.error("Error bulk adding events:", err);
    showMessage(messageEl, "Network error. Please try again.", "error");
  }
});

attachIfExists("updateHousingBtn", async () => {
  const eventId = document.getElementById("housingEventId").value.trim();
  const housingStatus = document.getElementById("housingStatus").value;
  const messageEl = document.getElementById("housingMessage");
  
  if (!eventId) {
    showMessage(messageEl, "Please enter an Event ID", "error");
    return;
  }

  if (!housingStatus) {
    showMessage(messageEl, "Please select a housing status", "error");
    return;
  }

  try {
    const res = await fetch(`${backendURL}/user/events/housing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userId: USER_ID, 
        eventId: parseInt(eventId),
        housingConfirmed: housingStatus
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(messageEl, data.error || "Failed to update housing status", "error");
      return;
    }

    const statusText = housingStatus === 'Y' ? 'confirmed ✓' : 'not confirmed';
    showMessage(messageEl, `Housing ${statusText}`, "success");
    
    document.getElementById("housingEventId").value = "";
    document.getElementById("housingStatus").value = "";
    
    const listEl = document.getElementById("myEventsList");
    if (listEl.innerHTML) {
      document.getElementById("viewEventsBtn").click();
    }
  } catch (err) {
    console.error("Error updating housing status:", err);
    showMessage(messageEl, "Network error. Please try again.", "error");
  }
});

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
  element.style.display = "block";
  
  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

async function updateEventCount() {
  const countEl = document.getElementById("eventCount");
  if (!countEl) return;

  countEl.style.display = "block";

  try {
    const res = await fetch(`${backendURL}/user/${USER_ID}/events`);
    if (!res.ok) {
      countEl.textContent = "Error loading event count";
      return;
    }

    const events = await res.json();
    const count = events.length;
    countEl.textContent = `You have ${count} event${count !== 1 ? "s" : ""} scheduled`;
  } catch (err) {
    console.error("Error fetching event count:", err);
    countEl.textContent = "Error loading event count";
  }
}
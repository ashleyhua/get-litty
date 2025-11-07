// script.js - simple frontend logic with mock data and comments for backend swap

// ----- Mock data (replace with backend response shape later) -----
const mockEvents = [
  { id:1, name:"Indie Night", city_name:"Chicago", state:"IL", date:"2025-11-20", venue_name:"United Center", ticket_price:120.00, avg_airbnb:90.00, latitude:41.880, longitude:-87.674 },
  { id:2, name:"Pop Extravaganza", city_name:"Austin", state:"TX", date:"2025-11-21", venue_name:"Moody Center", ticket_price:95.00, avg_airbnb:110.00, latitude:30.282, longitude:-97.748 },
  { id:3, name:"Rock Show", city_name:"New York", state:"NY", date:"2025-11-22", venue_name:"Madison Square Garden", ticket_price:150.00, avg_airbnb:140.00, latitude:40.750, longitude:-73.993 },
  { id:4, name:"College Beats", city_name:"Boston", state:"MA", date:"2025-11-20", venue_name:"TD Garden", ticket_price:60.00, avg_airbnb:80.00, latitude:42.366, longitude:-71.062 },
  { id:5, name:"Electro Fest", city_name:"Los Angeles", state:"CA", date:"2025-11-23", venue_name:"Crypto.com Arena", ticket_price:110.00, avg_airbnb:130.00, latitude:34.043, longitude:-118.267 }
];

// ----- DOM refs -----
const artistInput = document.getElementById('artistInput');
const stateSelect = document.getElementById('stateSelect');
const startDate   = document.getElementById('startDate');
const endDate     = document.getElementById('endDate');
const distanceRange = document.getElementById('distanceRange');
const distVal = document.getElementById('distVal');
const searchBtn = document.getElementById('searchBtn');
const surpriseBtn = document.getElementById('surpriseBtn');
const resultsBody = document.querySelector('#resultsTable tbody');
const bestPanel = document.getElementById('bestPanel');

distVal.textContent = distanceRange.value;
distanceRange.addEventListener('input', ()=> distVal.textContent = distanceRange.value);

// ----- Event handlers -----
searchBtn.addEventListener('click', async () => {
  searchBtn.disabled = true;
  try {
    const events = await getEvents();    // currently returns mock data
    const filtered = applyFilters(events);
    populateTable(filtered);
    renderBest(filtered);
    // renderMapTop5(filtered)  <-- add map rendering later (Leaflet)
  } catch (err) {
    console.error(err);
    alert('Error fetching events. Open console to see details.');
  } finally {
    searchBtn.disabled = false;
  }
});

surpriseBtn.addEventListener('click', ()=> {
  const genres = ["indie","pop","rock","electronic","jazz","hip hop"];
  const choice = genres[Math.floor(Math.random()*genres.length)];
  artistInput.value = choice;
  searchBtn.click();
});

// ----- Data / Filters -----

// Replace this function with a real fetch to your backend when ready.
// Example (uncomment and edit):
// async function getEvents() {
//   const q = artistInput.value.trim();
//   const url = new URL('https://your-backend.example.com/api/events');
//   if(q) url.searchParams.set('artist', q);
//   const res = await fetch(url.toString());
//   if(!res.ok) throw new Error('fetch failed');
//   return res.json(); // expects array of events with avg_airbnb, ticket_price, latitude, longitude
// }

async function getEvents() {
  // simulate network delay
  await new Promise(r=>setTimeout(r,200));
  return mockEvents.map(e => ({ ...e, total_cost: (e.ticket_price + e.avg_airbnb) }));
}

function applyFilters(events) {
  const q = artistInput.value.trim().toLowerCase();
  const state = stateSelect.value;
  const start = startDate.value;
  const end = endDate.value;
  // const maxDistance = Number(distanceRange.value);  // distance logic left for backend later

  return events.filter(e => {
    if (q && !((e.name||'').toLowerCase().includes(q) || (e.city_name||'').toLowerCase().includes(q))) return false;
    if (state && e.state !== state) return false;
    if (start && e.date < start) return false;
    if (end && e.date > end) return false;
    return true;
  }).map(e => ({ ...e, total_cost: Number((e.ticket_price + e.avg_airbnb).toFixed(2)) }))
    .sort((a,b)=>a.total_cost - b.total_cost);
}

// ----- UI rendering -----
function populateTable(events) {
  resultsBody.innerHTML = '';
  events.forEach((e, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${escapeHtml(e.city_name)}</td>
      <td>${e.date}</td>
      <td>${escapeHtml(e.venue_name)}</td>
      <td>$${(e.ticket_price||0).toFixed(2)}</td>
      <td>$${(e.avg_airbnb||0).toFixed(2)}</td>
      <td>$${(e.total_cost||0).toFixed(2)}</td>
    `;
    tr.addEventListener('click', ()=> {
      // highlight
      document.querySelectorAll('#resultsTable tbody tr').forEach(r=>r.classList.remove('selected'));
      tr.classList.add('selected');
      // possible: pan map to lat/lon if map implemented
    });
    resultsBody.appendChild(tr);
  });
  if(events.length === 0){
    resultsBody.innerHTML = `<tr><td colspan="7" class="muted">No results</td></tr>`;
  }
}

function renderBest(events) {
  if(!events || events.length === 0){ bestPanel.style.display = 'none'; return; }
  const best = events[0];
  bestPanel.style.display = 'block';
  bestPanel.innerHTML = `
    <strong>Best Option</strong>
    <div>${escapeHtml(best.name)} — ${escapeHtml(best.city_name)}, ${escapeHtml(best.state)} on ${best.date}</div>
    <div>Ticket: $${best.ticket_price.toFixed(2)} • Avg Airbnb: $${best.avg_airbnb.toFixed(2)} • <strong>Total: $${best.total_cost.toFixed(2)}</strong></div>
  `;
}

// simple escape
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

(function () {
  'use strict';
  const CITY_CORRIDORS = {
    'delhi': ['Connaught Place', 'MG Road', 'ITO Intersection', 'NH-48 Toll'],
    'bengaluru': ['Silk Board', 'Koramangala', 'Hebbal Flyover', 'MG Road'],
    'mumbai': ['Bandra-Worli', 'BKC', 'Dadar TT', 'Andheri WEH'],
    'hyderabad': ['Hitec City', 'Gachibowli', 'Jubilee Hills', 'Begumpet'],
    'chennai': ['Anna Salai', 'Kathipara', 'OMR', 'Central Station'],
    'kolkata': ['Park Circus', 'Howrah Bridge', 'EM Bypass', 'Esplanade'],
    'pune': ['University Circle', 'Shivajinagar', 'Chandani Chowk', 'Kalyani Nagar'],
    'ahmedabad': ['SG Highway', 'Iskcon Cross', 'Ashram Road', 'Pakwan Circle']
  };
  function getRandomState() {
    const r = Math.random();
    if (r < 0.4) return { color: 'green', status: 'free', label: 'Flowing' };
    if (r < 0.7) return { color: 'yellow', status: 'moderate', label: 'Moderate' };
    return { color: 'red', status: 'busy', label: 'Heavy Traffic' };
  }
  let updateInterval = null;
  function renderCorridors(city) {
    const grid = document.getElementById('corridor-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const corridors = CITY_CORRIDORS[city] || CITY_CORRIDORS['delhi'];
    corridors.forEach((name, idx) => {
      const state = getRandomState();
      const stoppedClass = state.color === 'red' ? 'stopped' : '';
      const card = document.createElement('div');
      card.className = 'corridor-card';
      card.dataset.idx = idx;
      let html = '<div class="corridor-header">';
      html += '<div class="corridor-name">' + name + '</div>';
      html += '<div class="corridor-status ' + state.status + '">' + state.label + '</div>';
      html += '</div>';
      html += '<div class="highway-view ' + stoppedClass + '">';
      html += '<div class="highway-lines"></div>';
      html += '<div class="car-sprite c1"></div>';
      html += '<div class="car-sprite c2"></div>';
      html += '<div class="car-sprite c3"></div>';
      html += '<div class="traffic-light-mini">';
      html += '<div class="tl-bulb red ' + (state.color === 'red' ? 'active' : '') + '"></div>';
      html += '<div class="tl-bulb yellow ' + (state.color === 'yellow' ? 'active' : '') + '"></div>';
      html += '<div class="tl-bulb green ' + (state.color === 'green' ? 'active' : '') + '"></div>';
      html += '</div></div>';
      card.innerHTML = html;
      grid.appendChild(card);
    });
  }
  function simulateLights() {
    const cards = document.querySelectorAll('.corridor-card');
    cards.forEach(card => {
      if (Math.random() < 0.2) {
        const state = getRandomState();
        const statusEl = card.querySelector('.corridor-status');
        statusEl.className = 'corridor-status ' + state.status;
        statusEl.textContent = state.label;
        const hwView = card.querySelector('.highway-view');
        if (state.color === 'red') {
          hwView.classList.add('stopped');
        } else {
          hwView.classList.remove('stopped');
        }
        const bulbs = card.querySelectorAll('.tl-bulb');
        bulbs.forEach(b => b.classList.remove('active'));
        card.querySelector('.tl-bulb.' + state.color).classList.add('active');
      }
    });
  }
  function init() {
    const sel = document.getElementById('corridor-city-select');
    if (sel) {
      sel.addEventListener('change', (e) => {
        renderCorridors(e.target.value);
      });
      renderCorridors(sel.value);
    }
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(simulateLights, 3000);
    console.log('[SIGNAL-IQ] corridors.js loaded');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
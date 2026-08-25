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
      
      card.innerHTML = \
        <div class="corridor-header">
          <div class="corridor-name">\</div>
          <div class="corridor-status \">\</div>
        </div>
        <div class="highway-view \">
          <div class="highway-lines"></div>
          <div class="car-sprite c1"></div>
          <div class="car-sprite c2"></div>
          <div class="car-sprite c3"></div>
          <div class="traffic-light-mini">
            <div class="tl-bulb red \"></div>
            <div class="tl-bulb yellow \"></div>
            <div class="tl-bulb green \"></div>
          </div>
        </div>
      \;
      
      grid.appendChild(card);
    });
  }

  function simulateLights() {
    const cards = document.querySelectorAll('.corridor-card');
    cards.forEach(card => {
      // 20% chance to change state
      if (Math.random() < 0.2) {
        const state = getRandomState();
        
        // update status label
        const statusEl = card.querySelector('.corridor-status');
        statusEl.className = \corridor-status \\;
        statusEl.textContent = state.label;
        
        // update highway view
        const hwView = card.querySelector('.highway-view');
        if (state.color === 'red') {
          hwView.classList.add('stopped');
        } else {
          hwView.classList.remove('stopped');
        }
        
        // update lights
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
    
    // update every 3 seconds
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


(function () {
  "use strict";

  const CITY_CORRIDORS = {
    "delhi": ["Connaught Place", "MG Road", "ITO Intersection", "NH-48 Toll"],
    "bengaluru": ["Silk Board", "Koramangala", "Hebbal Flyover", "MG Road"],
    "mumbai": ["Bandra-Worli", "BKC", "Dadar TT", "Andheri WEH"],
    "hyderabad": ["Hitec City", "Gachibowli", "Jubilee Hills", "Begumpet"],
    "chennai": ["Anna Salai", "Kathipara", "OMR", "Central Station"],
    "kolkata": ["Park Circus", "Howrah Bridge", "EM Bypass", "Esplanade"],
    "pune": ["University Circle", "Shivajinagar", "Chandani Chowk", "Kalyani Nagar"],
    "ahmedabad": ["SG Highway", "Iskcon Cross", "Ashram Road", "Pakwan Circle"]
  };

  function getRandomState() {
    const r = Math.random();
    if (r < 0.4) return { color: "green", status: "free", label: "Flowing" };
    if (r < 0.7) return { color: "yellow", status: "moderate", label: "Moderate" };
    return { color: "red", status: "busy", label: "Heavy Traffic" };
  }

  let updateInterval = null;
  let carAnimInterval = null;
  let cars = [];

  function renderCorridorsMap(city) {
    const grid = document.getElementById("corridor-grid");
    if (!grid) return;
    
    const corridors = CITY_CORRIDORS[city] || CITY_CORRIDORS["delhi"];
    
    // Create the highway map view instead of individual cards
    let html = "<div class=\"highway-map-view\" id=\"map-view\">";
    
    // Main horizontal road
    html += "<div class=\"map-road-main\" id=\"main-road\"><div class=\"map-road-lines\"></div></div>";
    
    // Cars container
    html += "<div id=\"cars-container\"></div>";
    
    // Add 4 cross roads and nodes
    const positions = [20, 40, 60, 80]; // percentages
    
    corridors.forEach((name, idx) => {
      const state = getRandomState();
      const pos = positions[idx];
      
      // Cross road
      html += "<div class=\"map-cross-road\" style=\"left: calc(" + pos + "% - 30px);\"></div>";
      
      // Node (Intersection)
      html += "<div class=\"map-node\" data-idx=\"" + idx + "\" style=\"left: " + pos + "%;\" data-state=\"" + state.color + "\">";
      
      // Label
      html += "<div class=\"map-node-label\">" + name;
      html += "<span class=\"status-text " + state.status + "\">" + state.label + "</span>";
      html += "</div>";
      
      // Traffic Light
      html += "<div class=\"map-tl\">";
      html += "<div class=\"map-tl-bulb red " + (state.color === "red" ? "active" : "") + "\"></div>";
      html += "<div class=\"map-tl-bulb yellow " + (state.color === "yellow" ? "active" : "") + "\"></div>";
      html += "<div class=\"map-tl-bulb green " + (state.color === "green" ? "active" : "") + "\"></div>";
      html += "</div>";
      
      html += "</div>";
    });
    
    html += "</div>";
    grid.innerHTML = html;
    
    initCars();
  }

  function initCars() {
    const container = document.getElementById("cars-container");
    if (!container) return;
    container.innerHTML = "";
    cars = [];
    
    for (let i = 0; i < 5; i++) {
      const car = document.createElement("div");
      const cClass = i % 2 === 0 ? "c1" : (i % 3 === 0 ? "c3" : "c2");
      car.className = "map-car " + cClass;
      car.style.left = "-100px";
      container.appendChild(car);
      cars.push({ el: car, pos: -100 - (i * 150), speed: 2 + Math.random() * 2 });
    }
    
    if (carAnimInterval) clearInterval(carAnimInterval);
    carAnimInterval = setInterval(animateCars, 50);
  }

  function animateCars() {
    const view = document.getElementById("map-view");
    if (!view) return;
    const width = view.offsetWidth;
    const nodes = document.querySelectorAll(".map-node");
    
    // check if any red light is active to stop the main road lines
    let anyRed = false;
    nodes.forEach(node => {
      if (node.dataset.state === "red") anyRed = true;
    });
    const mainRoad = document.getElementById("main-road");
    if (mainRoad) {
      if (anyRed) mainRoad.classList.add("stopped");
      else mainRoad.classList.remove("stopped");
    }
    
    cars.forEach(car => {
      // Move car
      let canMove = true;
      
      // Check if approaching a red light
      nodes.forEach(node => {
        const nodeX = (parseFloat(node.style.left) / 100) * width;
        const dist = nodeX - car.pos;
        if (node.dataset.state === "red" && dist > 20 && dist < 100) {
          canMove = false;
        }
      });
      
      if (canMove) {
        car.pos += car.speed;
      }
      
      if (car.pos > width + 100) {
        car.pos = -100;
      }
      
      car.el.style.left = car.pos + "px";
    });
  }

  function simulateLightsMap() {
    const nodes = document.querySelectorAll(".map-node");
    nodes.forEach(node => {
      if (Math.random() < 0.2) {
        const state = getRandomState();
        node.dataset.state = state.color;
        
        const statusEl = node.querySelector(".status-text");
        statusEl.className = "status-text " + state.status;
        statusEl.textContent = state.label;
        
        const bulbs = node.querySelectorAll(".map-tl-bulb");
        bulbs.forEach(b => b.classList.remove("active"));
        node.querySelector(".map-tl-bulb." + state.color).classList.add("active");
      }
    });
  }

  function init() {
    const sel = document.getElementById("corridor-city-select");
    if (sel) {
      sel.addEventListener("change", (e) => {
        renderCorridorsMap(e.target.value);
      });
      renderCorridorsMap(sel.value);
    }
    
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(simulateLightsMap, 3000);
    
    console.log("[SIGNAL-IQ] corridors.js (map version) loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


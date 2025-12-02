// --- 1. Initialize the Map ---
const map = L.map('map', {
    scrollWheelZoom: false, // Disable scroll zoom to allow page scrolling
    tap: false
}).setView([24.3, 67.5], 9);

// --- 2. Add a Basemap ---
L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3'],
    attribution: 'Map data &copy; Google'
}).addTo(map);

// --- 3. Define Styles ---
const style2030 = { color: "#56B4E9", weight: 1, opacity: 0.8, fillOpacity: 0.7 };
const style2040 = { color: "#0072B2", weight: 1, opacity: 0.8, fillOpacity: 0.7 };
const style2050 = { color: "#003B5C", weight: 1, opacity: 0.8, fillOpacity: 0.7 };

// --- 4. Load Data and Manage Layers ---
const riskLayers = {};
let activeLayer = null; // Variable to keep track of the currently active layer

// Helper function to fetch and create a styled GeoJSON layer
function createRiskLayer(url, style, popupText) {
    return fetch(url)
        .then(response => response.json())
        .then(data => L.geoJSON(data, { style: style, interactive: false })); // Popups disabled for a cleaner story
}

// Load all layers
Promise.all([
    createRiskLayer('inundation_baseline.json', style2030),
    createRiskLayer('risk_zone_2040.son', style2040),
    createRiskLayer('risk_zone_2050.json', style2050)
]).then(([layer2030, layer2040, layer2050]) => {
    riskLayers['scenario-2030'] = layer2030;
    riskLayers['scenario-2040'] = layer2040;
    riskLayers['scenario-2050'] = layer2050;

    // Set the initial active layer
    activeLayer = riskLayers['scenario-2030'];
    activeLayer.addTo(map);
    document.getElementById('scenario-2030').classList.add('active');

}).catch(error => console.error("Error loading GeoJSON data:", error));


// --- 5. Add Scrolling Interactivity ---
const storySections = document.querySelectorAll('.map-trigger');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const id = entry.target.id;
        
        // When a section is more than 60% in view
        if (entry.intersectionRatio > 0.6) {
            // Highlight the active text section
            entry.target.classList.add('active');

            // Switch the active map layer
            if (riskLayers[id] && activeLayer !== riskLayers[id]) {
                if (activeLayer) {
                    map.removeLayer(activeLayer);
                }
                activeLayer = riskLayers[id];
                activeLayer.addTo(map);
            }
        } else {
            // Remove highlight when it's not the main section
            entry.target.classList.remove('active');
        }
    });
}, {
    root: null, // observes intersections relative to the viewport
    threshold: 0.6 // triggers when 60% of the element is visible
});

// Tell the observer to watch each of our story sections
storySections.forEach(section => {
    observer.observe(section);
});

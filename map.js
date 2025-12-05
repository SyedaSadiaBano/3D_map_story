


/ --- 1. Initialize the Map ---
const map = L.map('map').setView([24.3, 67.5], 9); // Centered on the Sindh Coast

// --- 2. Add a Basemap ---
L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3'],
    attribution: 'Map data &copy; Google'
}).addTo(map);

// --- 3. Define Styles for Each Scenario ---
const style2030 = { color: "#56B4E9", weight: 1, opacity: 0.8, fillOpacity: 0.7 };
const style2040 = { color: "#0072B2", weight: 1, opacity: 0.8, fillOpacity: 0.7 };
const style2050 = { color: "#003B5C", weight: 1, opacity: 0.8, fillOpacity: 0.7 };

// --- 4. Load Data and Manage Layers ---
const riskLayers = {};

// Helper function to fetch and create a styled GeoJSON layer
function createRiskLayer(url, style, popupText) {
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            return L.geoJSON(data, {
                style: style,
                onEachFeature: (feature, layer) => { layer.bindPopup(popupText); }
            });
        });
}

// Load all layers
Promise.all([
    createRiskLayer('inundation_baseline.json', style2030, '<strong>2030 Risk Zone:</strong> Baseline Inundation Area'),
    createRiskLayer('risk_zone_2040.json', style2040, '<strong>2040 Risk Zone:</strong> Vulnerable to episodic flooding.'),
    createRiskLayer('risk_zone_2050.json', style2050, '<strong>2050 Risk Zone:</strong> Highly vulnerable to episodic flooding.')
]).then(([layer2030, layer2040, layer2050]) => {
    riskLayers['2030'] = layer2030;
    riskLayers['2040'] = layer2040;
    riskLayers['2050'] = layer2050;

    // Add the default layer (2030) to the map
    riskLayers['2030'].addTo(map);
}).catch(error => console.error("Error loading GeoJSON data:", error));


// --- 5. Add Interactivity ---
document.querySelectorAll('input[name="scenario"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
        const selectedScenario = event.target.value;
        
        Object.keys(riskLayers).forEach(key => {
            if (map.hasLayer(riskLayers[key])) {
                map.removeLayer(riskLayers[key]);
            }
        });

        if (riskLayers[selectedScenario]) {
            riskLayers[selectedScenario].addTo(map);
        }
    });
});




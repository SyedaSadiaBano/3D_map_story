// =================================================================
// Step 1: Get Your Cesium ion Access Token
// =================================================================
// This should contain your valid token from cesium.com/ion/tokens
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NTM4ODEwOS1kY2YzLTQ1NTQtYjdkNi00MjVhZDhiOWI5MjQiLCJpZCI6MzY1NjQ0LCJpYXQiOjE3NjQ2MjgwMTN9.VbtictK8wX9wRujhyof4bik51dNsNYPfSRqqatIrfFY'; // MAKE SURE YOUR TOKEN IS PASTED HERE

// =================================================================
// Step 2: Initialize the Cesium Viewer
// =================================================================
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  infoBox: false,
  selectionIndicator: false,
  shouldAnimate: true,
});

viewer.scene.globe.enableLighting = true;

// =_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=
//
//  SECTION 1: LOAD YOUR DATASETS
//
// =_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=

// --- LOAD 3D BUILDING TILESET ---
const buildingAssetId = 4182584; 
try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(buildingAssetId);
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.error(`Error loading tileset: ${error}`);
}

// --- LOAD RISK ZONE GEOJSON LAYERS (CORRECTED PATHS AND FILENAMES) ---
const riskZoneData = [
  { year: '2030', path: './inundation_baseline.json' },
  { year: '2040', path: './risk_zone_2040.json' },
  { year: '2050', path: './risk_zone_2050.json' }
];

const riskZoneColors = [
  Cesium.Color.fromBytes(255, 235, 59, 100), // Yellow for 2030
  Cesium.Color.fromBytes(255, 152, 0, 100),  // Orange for 2040
  Cesim.Color.fromBytes(244, 67, 54, 100)   // Red for 2050
];

const riskZoneLayers = {};

riskZoneData.forEach(async (zone, index) => {
  try {
    const dataSource = await Cesium.GeoJsonDataSource.load(zone.path, {
      stroke: Cesium.Color.BLACK.withAlpha(0.5),
      fill: riskZoneColors[index],
      strokeWidth: 2
    });
    dataSource.name = `Risk Zone ${zone.year}`;
    riskZoneLayers[zone.year] = dataSource; // Store the layer using the correct year
    dataSource.show = false; // Initially hide the layer
    await viewer.dataSources.add(dataSource);
  } catch (error) {
    console.error(`Failed to load GeoJSON file ${zone.path}:`, error);
  }
});


// =_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=
//
//  SECTION 2: DEFINE CAMERA LOCATIONS (WAYPOINTS)
//
// =_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=
const waypoints = [
  {
    title: "Introduction",
    description: "Coastal areas of Sindh, Pakistan, are facing a significant threat from rising sea levels. This visualization shows the projected coastal flood risk zones for 2030, 2040, and 2050.",
    location: {
      destination: Cesium.Cartesian3.fromDegrees(67.4, 24.8, 40000),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-45), roll: 0 }
    },
    visibleLayer: null
  },
  {
    title: "Projected Risk in 2030",
    description: "By 2030, the initial effects of sea-level rise become apparent, with low-lying coastal areas experiencing more frequent flooding. This is the first line of impact.",
    location: {
      destination: Cesium.Cartesian3.fromDegrees(67.15, 24.8, 15000),
      orientation: { heading: Cesium.Math.toRadians(20), pitch: Cesium.Math.toRadians(-35), roll: 0 }
    },
    visibleLayer: '2030'
  },
  {
    title: "Projected Risk in 2040",
    description: "A decade later, the flood risk zone expands further inland. Areas that were previously safe are now vulnerable, impacting infrastructure and residential zones.",
    location: {
      destination: Cesium.Cartesian3.fromDegrees(67.05, 24.8, 15000),
      orientation: { heading: Cesium.Math.toRadians(-10), pitch: Cesium.Math.toRadians(-35), roll: 0 }
    },
    visibleLayer: '2040'
  },
  {
    title: "Projected Risk in 2050",
    description: "By mid-century, the situation becomes critical. The 2050 flood risk zone covers a significant portion of the coastal city, posing a severe threat to the population and economy.",
    location: {
      destination: Cesium.Cartesian3.fromDegrees(67.0, 24.83, 15000),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-35), roll: 0 }
    },
    visibleLayer: '2050'
  },
  {
    title: "A City Transformed",
    description: "Fly over the affected areas to see the scale of the challenge. Urgent adaptation and mitigation strategies are needed to protect these communities.",
    location: {
      destination: Cesium.Cartesian3.fromDegrees(67.08, 24.78, 25000),
      orientation: { heading: Cesium.Math.toRadians(45), pitch: Cesium.Math.toRadians(-50), roll: 0 }
    },
    visibleLayer: '2050'
  }
];

// =_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=
//
//  SECTION 3: STORY NAVIGATION & UI
//
// =_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=
let currentWaypoint = 0;
const storyContainer = document.getElementById('story');
const waypointTitle = document.getElementById('waypoint-title');
const waypointDescription = document.getElementById('waypoint-description');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');

function updateStoryUI(index) {
  const waypoint = waypoints[index];
  waypointTitle.textContent = waypoint.title;
  waypointDescription.textContent = waypoint.description;

  viewer.camera.flyTo({
    destination: waypoint.location.destination,
    orientation: waypoint.location.orientation,
    duration: 3.0
  });

  Object.keys(riskZoneLayers).forEach(year => {
    riskZoneLayers[year].show = (year === waypoint.visibleLayer);
  });

  prevButton.disabled = (index === 0);
  nextButton.disabled = (index === waypoints.length - 1);
}

prevButton.addEventListener('click', () => {
  if (currentWaypoint > 0) {
    currentWaypoint--;
    updateStoryUI(currentWaypoint);
  }
});

nextButton.addEventListener('click', () => {
  if (currentWaypoint < waypoints.length - 1) {
    currentWaypoint++;
    updateStoryUI(currentWaypoint);
  }
});

// This timeout is a failsafe to ensure UI updates after all data has loaded
setTimeout(() => {
    updateStoryUI(0);
}, 1000);

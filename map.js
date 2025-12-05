// =================================================================
// Setup
// =================================================================

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('threejsContainer').appendChild(renderer.domElement);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lighting
const ambientLight = new THREE.AmbientLight(0xcccccc);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 75);
scene.add(directionalLight);

// Global variables
let buildingsGroup = new THREE.Group();
let riskZoneLayers = {};
let waypoints = [];
let currentWaypoint = 0;
let minX = Infinity, minY = Infinity; // To store the origin of the projected data

// UI Elements
const waypointTitle = document.getElementById('waypoint-title');
const waypointDescription = document.getElementById('waypoint-description');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');

// =================================================================
// Data Loading
// =================================================================

const buildingDataUrl = 'https://zggeb2r2okbrrjju.public.blob.vercel-storage.com/sindh-buildings.json';

fetch(buildingDataUrl)
  .then(response => {
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
    return response.json();
  })
  .then(data => {
    console.log('Building data loaded successfully');
    createBuildings(data);
    loadRiskZones();
    setupWaypoints();
    updateStoryUI(0);
  })
  .catch(error => console.error('There was a problem with the fetch operation:', error));

function createBuildings(data) {
  const srcProjection = 'EPSG:4326';
  const destProjection = 'EPSG:3857';
  const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });

  // *** THIS IS THE FIX FOR THE MEMORY ERROR ***
  // The full dataset is too large and causes WebGL to run out of memory.
  // We slice the array to only render the first 5000 features as a demonstration.
  const features = data.features.slice(0, 5000);

  // First, find the origin based on the sliced data
  features.forEach(feature => {
    if (!feature.geometry || !feature.geometry.coordinates || !feature.geometry.coordinates[0]) return;
    const coords = feature.geometry.coordinates[0];
    coords.forEach(c => {
      if (isFinite(c[0]) && isFinite(c[1])) {
        const p = proj4(srcProjection, destProjection, [c[0], c[1]]);
        if (p[0] < minX) minX = p[0];
        if (p[1] < minY) minY = p[1];
      }
    });
  });

  if (minX === Infinity) { // If no valid coordinates were found
      console.error("No valid coordinates found in the dataset to establish an origin.");
      return;
  }

  const scale = 0.01;
  features.forEach(feature => {
    if (!feature.geometry || !feature.geometry.coordinates || !feature.geometry.coordinates[0]) return;
    const coords = feature.geometry.coordinates[0];
    const shape = new THREE.Shape();
    const projectedCoords = coords
      .filter(c => isFinite(c[0]) && isFinite(c[1]))
      .map(c => {
        const p = proj4(srcProjection, destProjection, [c[0], c[1]]);
        return { x: (p[0] - minX) * scale, y: (p[1] - minY) * scale };
    });
    
    if (projectedCoords.length > 2) {
        shape.moveTo(projectedCoords[0].x, projectedCoords[0].y);
        for (let i = 1; i < projectedCoords.length; i++) shape.lineTo(projectedCoords[i].x, projectedCoords[i].y);
        const extrudeSettings = { depth: (Math.random() * 2 + 0.5), bevelEnabled: false };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const building = new THREE.Mesh(geometry, buildingMaterial);
        buildingsGroup.add(building);
    }
  });
  
  scene.add(buildingsGroup);
}

function loadRiskZones() {
    const riskZoneFiles = {
        '2030': { path: './inundation_baseline.json', color: 0x00FFFF }, // Cyan
        '2040': { path: './risk_zone_2040.json', color: 0x0000FF },   // Blue
        '2050': { path: './risk_zone_2050.json', color: 0x800080 }    // Purple
    };
    const srcProjection = 'EPSG:4326';
    const destProjection = 'EPSG:3857';
    const scale = 0.01;

    for (const year in riskZoneFiles) {
        const { path, color } = riskZoneFiles[year];
        fetch(path)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${path}`);
                return response.json();
            })
            .then(data => {
                const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
                const zoneGroup = new THREE.Group();
                data.features.forEach(feature => {
                    if (!feature.geometry || !feature.geometry.coordinates || !feature.geometry.coordinates[0]) return;
                    const coords = feature.geometry.coordinates[0];
                    const shape = new THREE.Shape();
                    const projectedCoords = coords
                        .filter(c => isFinite(c[0]) && isFinite(c[1]))
                        .map(c => {
                            const p = proj4(srcProjection, destProjection, [c[0], c[1]]);
                            return { x: (p[0] - minX) * scale, y: (p[1] - minY) * scale };
                        });
                    
                    if (projectedCoords.length > 2) {
                        shape.moveTo(projectedCoords[0].x, projectedCoords[0].y);
                        for (let i = 1; i < projectedCoords.length; i++) shape.lineTo(projectedCoords[i].x, projectedCoords[i].y);
                        const geometry = new THREE.ShapeGeometry(shape);
                        const mesh = new THREE.Mesh(geometry, material);
                        zoneGroup.add(mesh);
                    }
                });
                zoneGroup.visible = false;
                riskZoneLayers[year] = zoneGroup;
                scene.add(zoneGroup);
            })
            .catch(error => console.error(error));
    }
}

// =================================================================
// Story Navigation
// =================================================================

function setupWaypoints() {
    const box = new THREE.Box3().setFromObject(buildingsGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    waypoints = [
        {
            title: "A Coastline at Risk",
            description: "A 3D view of sea-level rise on the Sindh Coast.",
            cameraPosition: new THREE.Vector3(center.x, center.y - size.y * 1.2, center.z + size.z * 2),
            cameraTarget: center,
            visibleLayer: null
        },
        {
            title: "2030: The Baseline Risk",
            description: "By 2030, areas at or near the current mean sea level are considered at high risk.",
            cameraPosition: new THREE.Vector3(center.x, center.y - size.y / 2, center.z + size.z),
            cameraTarget: center,
            visibleLayer: '2030'
        },
        {
            title: "2040: Expanding Vulnerability",
            description: "The zone of vulnerability expands, making the 50-meter buffer zone susceptible to storm surges.",
            cameraPosition: new THREE.Vector3(center.x, center.y, center.z + size.z * 1.5),
            cameraTarget: center,
            visibleLayer: '2040'
        },
        {
            title: "2050: A Critical Threshold",
            description: "By mid-century, the flood risk zone expands to 150 meters from the baseline.",
            cameraPosition: new THREE.Vector3(center.x, center.y + size.y / 2, center.z + size.z),
            cameraTarget: center,
            visibleLayer: '2050'
        }
    ];
}

function updateStoryUI(index) {
  const waypoint = waypoints[index];
  waypointTitle.textContent = waypoint.title;
  waypointDescription.textContent = waypoint.description;

  for (const year in riskZoneLayers) {
      riskZoneLayers[year].visible = (year === waypoint.visibleLayer);
  }

  new TWEEN.Tween(camera.position).to(waypoint.cameraPosition, 2000).easing(TWEEN.Easing.Quadratic.InOut).start();
  new TWEEN.Tween(controls.target).to(waypoint.cameraTarget, 2000).easing(TWEEN.Easing.Quadratic.InOut).start();

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

// =================================================================
// Render Loop
// =================================================================

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
  renderer.render(scene, camera);
}

animate();

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

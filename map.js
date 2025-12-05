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
let riskZoneLayers = {};
let waypoints = [];
let currentWaypoint = 0;
let minX = Infinity, minY = Infinity; // To store the origin of the projected data


// =================================================================
// Data Loading
// =================================================================

Promise.all([
    fetch('https://raw.githubusercontent.com/SyedaSadiaBano/3D_map_story/main/inundation_baseline.json').then(res => res.json()),
    fetch('https://raw.githubusercontent.com/SyedaSadiaBano/3D_map_story/main/risk_zone_2040.json').then(res => res.json()),
    fetch('https://raw.githubusercontent.com/SyedaSadiaBano/3D_map_story/main/risk_zone_2050.json').then(res => res.json())
]).then(([baseline, riskZone2040, riskZone2050]) => {
    const riskZoneData = {
        '2030': baseline,
        '2040': riskZone2040,
        '2050': riskZone2050
    };
    loadRiskZones(riskZoneData);
    setupScene();
}).catch(error => {
    console.error('There was a problem with the fetch operation:', error);
    alert(`Error Loading Map Data: ${error.message}`);
});

function loadRiskZones(riskZoneData) {
    const riskZoneFiles = {
        '2030': { color: 0x40E0D0 }, // Turquoise
        '2040': { color: 0x4169E1 },   // Royal Blue
        '2050': { color: 0x4B0082 }    // Indigo
    };
    const srcProjection = 'EPSG:4326';
    const destProjection = 'EPSG:3857';
    const scale = 0.01;

    // First, find the origin based on all risk zone data
    for (const year in riskZoneData) {
        const data = riskZoneData[year];
        data.features.forEach(feature => {
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
    }

    if (minX === Infinity) { // If no valid coordinates were found
        console.error("No valid coordinates found in the dataset to establish an origin.");
        return;
    }

    for (const year in riskZoneData) {
        const data = riskZoneData[year];
        const color = riskZoneFiles[year].color;
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
        zoneGroup.visible = true;
        riskZoneLayers[year] = zoneGroup;
        scene.add(zoneGroup);
    }
}

// =================================================================
// Scene Setup
// =================================================================

function setupScene() {
    let combinedBox = new THREE.Box3();
    for (const year in riskZoneLayers) {
        const box = new THREE.Box3().setFromObject(riskZoneLayers[year]);
        combinedBox.union(box);
    }
    const center = combinedBox.getCenter(new THREE.Vector3());
    const size = combinedBox.getSize(new THREE.Vector3());

    const planeGeometry = new THREE.PlaneGeometry(size.x * 1.2, size.y * 1.2);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xD2B48C, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set(center.x, center.y, -0.1);
    scene.add(plane);

    camera.position.set(center.x, center.y, center.z + size.y * 2.5);
    controls.target.set(center.x, center.y, 0);
}


// =================================================================
// Render Loop
// =================================================================

function animate() {
  requestAnimationFrame(animate);
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

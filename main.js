// Voxel World Explorer - Main JavaScript File

console.log("Game starting...");

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Add a sky-blue background
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadow mapping
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
// document.body.appendChild(renderer.domElement); // Append renderer to body - Removed as renderer uses existing canvas

// UI Element Reference
const levelDisplayElement = document.getElementById('level-display');
const scoreDisplayElement = document.getElementById('score-display'); // Added score element reference

// Score Variables
let totalScore = 0;
let currentLevelJumps = 0;
let currentLevelResets = 0;

// Score Update Function
function updateScoreDisplay() {
    if (scoreDisplayElement) {
        scoreDisplayElement.textContent = `Score: ${totalScore}`;
    }
}

// --- Materials (Changed to Standard) ---
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.2 }); // Grey platforms
const startPlatformMaterial = new THREE.MeshStandardMaterial({ color: 0xccffcc, roughness: 0.8, metalness: 0.2 }); // Light green start
const goalPlatformMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffccaa, 
    roughness: 0.8, 
    metalness: 0.2, 
    emissive: 0xffccaa, // Use the same color for emission
    emissiveIntensity: 0.6 // Adjust intensity (0 to 1 typically)
}); // Light orange goal - now emissive
const lavaMaterial = new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.9, metalness: 0.1 }); // Red-orange lava (less reflective)

// --- Character Body Part Dimensions (Moved Up) ---
const headSize = 0.4;
const torsoWidth = 0.6;
const torsoHeight = 0.8;
const torsoDepth = 0.4;
const armLength = 0.7;
const armWidth = 0.2;
const legLength = 0.9;
const legWidth = 0.25;

// --- Level Data ---
const platformHeight = 0.5;
const lavaLevelY = -5; // Lower lava for more vertical levels

const levelData = [
    // Level 0: Simple horizontal
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 4, y: 0, z: 0, width: 2, depth: 2, type: 'normal' },
        { x: 8, y: 0, z: 0, width: 2, depth: 2, type: 'goal' },
    ],
    // Level 1: Simple vertical + horizontal
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 0, y: 3, z: 4, width: 2, depth: 2, type: 'normal' }, // Higher platform
        { x: 4, y: 3, z: 4, width: 2, depth: 2, type: 'normal' },
        { x: 8, y: 0, z: 4, width: 2, depth: 2, type: 'goal' }, // Back down
    ],
    // Level 2: More complex path with varying heights
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 4, y: 1, z: 0, width: 1.5, depth: 1.5, type: 'normal' },
        { x: 4, y: 2, z: 4, width: 1.5, depth: 1.5, type: 'normal' },
        { x: 0, y: 3, z: 4, width: 1.5, depth: 1.5, type: 'normal' },
        { x: -3, y: 4, z: 4, width: 3, depth: 1.5, type: 'goal' },
    ],
    // Level 3: Precise horizontal jumps
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 5, y: 0, z: 2, width: 1, depth: 1, type: 'normal' }, // Small platform
        { x: 1, y: 0, z: 4, width: 1, depth: 1, type: 'normal' }, // Small platform
        { x: 5, y: 0, z: 6, width: 1, depth: 1, type: 'normal' }, // Small platform
        { x: 9, y: 1, z: 8, width: 2, depth: 2, type: 'goal' },   // Slightly higher goal
    ],
    // Level 4: Vertical Climb
    [
        { x: 0, y: 0, z: 0, width: 3, depth: 3, type: 'start' },
        { x: 0, y: 3, z: 4, width: 2, depth: 2, type: 'normal' },
        { x: 4, y: 6, z: 4, width: 2, depth: 2, type: 'normal' },
        { x: 4, y: 9, z: 0, width: 2, depth: 2, type: 'normal' },
        { x: 0, y: 12, z: 0, width: 2, depth: 2, type: 'goal' },
    ],
    // Level 5: Simple Branching
    [
        { x: 0, y: 0, z: 0, width: 3, depth: 3, type: 'start' },
        { x: 5, y: 0, z: 0, width: 2, depth: 2, type: 'normal' }, // Junction
        // Path A (Left)
        { x: 8, y: 1, z: -3, width: 1.5, depth: 1.5, type: 'normal' },
        // Path B (Right)
        { x: 8, y: 1, z: 3, width: 1.5, depth: 1.5, type: 'normal' },
        // Merge
        { x: 12, y: 0, z: 0, width: 2, depth: 2, type: 'normal' },
        { x: 16, y: 0, z: 0, width: 2, depth: 2, type: 'goal' },
    ],
    // Level 6: Smaller Platforms, Increased Accuracy
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 4, y: 0.5, z: 1, width: 1, depth: 1, type: 'normal' },
        { x: 1, y: 1, z: 4, width: 0.8, depth: 0.8, type: 'normal' }, // Smaller
        { x: 4, y: 1.5, z: 7, width: 0.8, depth: 0.8, type: 'normal' }, // Smaller
        { x: 8, y: 2, z: 8, width: 1, depth: 1, type: 'normal' },
        { x: 12, y: 1.5, z: 6, width: 2, depth: 2, type: 'goal' }, // Descent to goal
    ],
    // Level 7: Zig-Zag Climb
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 3, y: 2, z: 3, width: 1.5, depth: 1.5, type: 'normal' },
        { x: -1, y: 4, z: 6, width: 1.5, depth: 1.5, type: 'normal' },
        { x: 3, y: 6, z: 9, width: 1.5, depth: 1.5, type: 'normal' },
        { x: -1, y: 8, z: 12, width: 1.5, depth: 1.5, type: 'normal' },
        { x: 3, y: 10, z: 15, width: 2, depth: 2, type: 'goal' },
    ],
    // Level 8: Longer Jumps and Descent
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 6, y: 1, z: 0, width: 1.5, depth: 1.5, type: 'normal' }, // Longer jump
        { x: 6, y: 4, z: 5, width: 1.5, depth: 1.5, type: 'normal' }, // Climb
        { x: 12, y: 5, z: 5, width: 1.5, depth: 1.5, type: 'normal' },// Long jump again
        { x: 12, y: 1, z: 10, width: 1.5, depth: 1.5, type: 'normal' },// Descend
        { x: 6, y: 0, z: 10, width: 2, depth: 2, type: 'goal' },     // Descend to goal
    ],
    // Level 9: Precision Jumps (Very Small Platforms)
    [
        { x: 0, y: 0, z: 0, width: 1.5, depth: 1.5, type: 'start' },
        { x: 4, y: 0, z: 0, width: 0.5, depth: 0.5, type: 'normal' }, // Tiny!
        { x: 4, y: 2, z: 4, width: 0.5, depth: 0.5, type: 'normal' }, // Tiny + climb
        { x: 0, y: 2, z: 8, width: 0.5, depth: 0.5, type: 'normal' }, // Tiny
        { x: 0, y: 4, z: 12, width: 0.5, depth: 0.5, type: 'normal' },// Tiny + climb
        { x: 4, y: 4, z: 16, width: 1.5, depth: 1.5, type: 'goal' },
    ],
    // Level 10: Complex Path (Up, Down, Small Platforms)
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 5, y: 2, z: 2, width: 1, depth: 1, type: 'normal' },   // Up
        { x: 2, y: 4, z: 6, width: 0.8, depth: 0.8, type: 'normal' }, // Up, smaller
        { x: 5, y: 1, z: 10, width: 1, depth: 1, type: 'normal' },  // Long jump down
        { x: 9, y: 3, z: 12, width: 0.8, depth: 0.8, type: 'normal' },// Up, smaller
        { x: 12, y: 0, z: 15, width: 2, depth: 2, type: 'goal' },  // Down to goal
    ],
    // --- LEVELS WITH MOVING PLATFORMS --- 
    // Level 11: Simple Horizontal Mover
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 4, y: 0, z: 0, width: 2, depth: 2, type: 'normal', moves: true, moveAxis: 'z', moveDist: 6, moveSpeed: 1.5 },
        { x: 4, y: 0, z: 10, width: 2, depth: 2, type: 'goal' },
    ],
    // Level 12: Vertical Mover (Elevator)
    [
        { x: 0, y: 0, z: 0, width: 3, depth: 3, type: 'start' },
        { x: 5, y: 0, z: 0, width: 1.5, depth: 1.5, type: 'normal', moves: true, moveAxis: 'y', moveDist: 5, moveSpeed: 1 },
        { x: 5, y: 8, z: 0, width: 3, depth: 3, type: 'goal' }, // Need to land on it while high up
    ],
    // Level 13: Timed Horizontal Movers
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 4, y: 0, z: 0, width: 1.5, depth: 1.5, type: 'normal', moves: true, moveAxis: 'x', moveDist: 4, moveSpeed: 2 },
        { x: 10, y: 0, z: 0, width: 1.5, depth: 1.5, type: 'normal', moves: true, moveAxis: 'x', moveDist: -4, moveSpeed: 1.5 }, // Opposite direction
        { x: 16, y: 0, z: 0, width: 2, depth: 2, type: 'goal' },
    ],
    // Level 14: Horizontal + Vertical Movers
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' },
        { x: 4, y: 0, z: 0, width: 1.5, depth: 1.5, type: 'normal', moves: true, moveAxis: 'z', moveDist: 5, moveSpeed: 1.2 },
        { x: 4, y: 0, z: 8, width: 1.5, depth: 1.5, type: 'normal' }, // Static platform 
        { x: 8, y: 0, z: 8, width: 1.5, depth: 1.5, type: 'normal', moves: true, moveAxis: 'y', moveDist: 4, moveSpeed: 1.5 }, // Vertical
        { x: 8, y: 6, z: 8, width: 2, depth: 2, type: 'goal' },
    ],
    // Level 15: Tricky Movers Gauntlet
    [
        { x: 0, y: 0, z: 0, width: 2, depth: 2, type: 'start' }, 
        { x: 4, y: 0, z: 0, width: 1, depth: 1, type: 'normal', moves: true, moveAxis: 'x', moveDist: 3, moveSpeed: 2.5 }, // Fast small mover
        { x: 9, y: 2, z: 3, width: 1.5, depth: 1.5, type: 'normal', moves: true, moveAxis: 'z', moveDist: -4, moveSpeed: 1 }, // Up and back
        { x: 9, y: 2, z: -3, width: 1.5, depth: 1.5, type: 'normal' }, // Static
        { x: 13, y: 4, z: -3, width: 1, depth: 1, type: 'normal', moves: true, moveAxis: 'y', moveDist: 3, moveSpeed: 1.8 }, // Vertical
        { x: 13, y: 9, z: -3, width: 2, depth: 2, type: 'goal' },
    ]
];

let currentLevelIndex = 0;

// --- Get Level from Query String --- 
const urlParams = new URLSearchParams(window.location.search);
const requestedLevel = parseInt(urlParams.get('level'), 10);

if (!isNaN(requestedLevel) && requestedLevel >= 0 && requestedLevel < levelData.length) {
    currentLevelIndex = requestedLevel;
    console.log(`Starting at level ${currentLevelIndex} specified in URL.`);
} else {
    console.log('No valid level specified in URL, starting at level 0.');
}

let platformMeshes = []; // To hold meshes of the current level
let startPosition = new THREE.Vector3(0, platformHeight, 0); // Will be updated by loadLevel

// Jumping variables (Moved Up)
const gravity = 9.8; 
const jumpStrength = 9.0; // Increased jump strength
let verticalVelocity = 0;
let isJumping = false;
let canJump = false; // Make canJump global

// --- Add Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Stronger white light
directionalLight.position.set(10, 20, 15); // Position the light
directionalLight.castShadow = true; // Enable shadow casting
scene.add(directionalLight);

// Configure shadow properties for the directional light
directionalLight.shadow.mapSize.width = 1024; // default is 512
directionalLight.shadow.mapSize.height = 1024; // default is 512
directionalLight.shadow.camera.near = 0.5;    // default
directionalLight.shadow.camera.far = 50;     // default
// Adjust shadow camera frustum to cover the general play area
const shadowCamSize = 20;
directionalLight.shadow.camera.left = -shadowCamSize;
directionalLight.shadow.camera.right = shadowCamSize;
directionalLight.shadow.camera.top = shadowCamSize;
directionalLight.shadow.camera.bottom = -shadowCamSize;
// Optional: Add a helper to visualize the shadow camera
// const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
// scene.add(shadowHelper);

// --- Generate Level Geometry ---
function loadLevel(levelIndex) {
    // Clear previous level's meshes
    platformMeshes.forEach(p => scene.remove(p.mesh));
    platformMeshes = []; // Reset platform data array

    const level = levelData[levelIndex];
    if (!level) {
        console.log("Congratulations! You beat all levels!");
        if (levelDisplayElement) {
            levelDisplayElement.textContent = "You Win!";
        }
        // TODO: Add a proper win state screen or loop back?
        // For now, just prevent further level loading
        // currentLevelIndex = 0; // Don't loop back automatically
        // loadLevel(currentLevelIndex);
        return; // Stop execution here
    }

    console.log(`Loading Level ${levelIndex}...`);
    if (levelDisplayElement) {
        levelDisplayElement.textContent = `Level: ${levelIndex}`;
    }

    // Reset level score counters
    currentLevelJumps = 0;
    currentLevelResets = 0;

    level.forEach(pData => {
        const platGeo = new THREE.BoxGeometry(pData.width, platformHeight, pData.depth);
        let platMat;
        const platformTopY = pData.y + platformHeight; // Calculate top Y based on platform's base Y

        switch (pData.type) {
            case 'start':
                platMat = startPlatformMaterial;
                startPosition.set(pData.x, platformTopY, pData.z); // Set start pos for this level
                break;
            case 'goal':
                platMat = goalPlatformMaterial;
                break;
            default:
                platMat = platformMaterial;
        }
        const platformMesh = new THREE.Mesh(platGeo, platMat);
        // Position base of platform at its defined Y
        platformMesh.position.set(pData.x, pData.y, pData.z);
        platformMesh.translateY(platformHeight / 2); // Move up so top is at platformTopY

        platformMesh.castShadow = true; // Platforms cast shadows
        platformMesh.receiveShadow = true; // Platforms receive shadows

        scene.add(platformMesh);

        // Store mesh, data, calculated top Y, and movement details
        const platformInfo = {
            mesh: platformMesh,
            data: pData,
            topY: platformTopY,
            isMoving: pData.moves === true,
            initialPosition: platformMesh.position.clone() // Store starting position for movement calculations
        };
        if (platformInfo.isMoving) {
            platformInfo.moveAxis = pData.moveAxis || 'x'; // Default to x if not specified
            platformInfo.moveDist = pData.moveDist || 0;
            platformInfo.moveSpeed = pData.moveSpeed || 1;
        }
        platformMeshes.push(platformInfo); 
    });

    resetPlayer(); // Place player at the start of the loaded level
}

// Add Lava Plane
const lavaSize = 50; // Make it large enough to cover potential area
const lavaGeo = new THREE.PlaneGeometry(lavaSize, lavaSize);
const lavaMesh = new THREE.Mesh(lavaGeo, lavaMaterial);
lavaMesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
lavaMesh.position.y = lavaLevelY;   // Position it below platforms
lavaMesh.receiveShadow = true; // Lava plane receives shadows
scene.add(lavaMesh);

// --- Reset Function ---
function resetPlayer() {
    characterGroup.position.copy(startPosition);
    verticalVelocity = 0;
    isJumping = false;
    canJump = true; // Can jump immediately from start platform
    console.log("Player reset!");
}

// --- Character Setup --- 
const characterGroup = new THREE.Group();
characterGroup.castShadow = true; // Entire character group casts shadows
scene.add(characterGroup);

// Character Materials (Simple colors for now, Changed to Standard)
const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6, metalness: 0.1 }); // Skin tone
const torsoMaterial = new THREE.MeshStandardMaterial({ color: 0x0055ff, roughness: 0.7, metalness: 0.1 }); // Blue shirt
const legsMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7, metalness: 0.1 }); // Dark pants

// Create Geometries
const headGeo = new THREE.BoxGeometry(headSize, headSize, headSize);
const torsoGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
const armGeo = new THREE.BoxGeometry(armWidth, armLength, armWidth);
const legGeo = new THREE.BoxGeometry(legWidth, legLength, legWidth);

// Create Meshes
const headMesh = new THREE.Mesh(headGeo, headMaterial);
const torsoMesh = new THREE.Mesh(torsoGeo, torsoMaterial);
const leftArmMesh = new THREE.Mesh(armGeo, torsoMaterial); // Same color as torso for sleeves
const rightArmMesh = new THREE.Mesh(armGeo, torsoMaterial);
const leftLegMesh = new THREE.Mesh(legGeo, legsMaterial);
const rightLegMesh = new THREE.Mesh(legGeo, legsMaterial);

// Enable shadow casting for individual parts (optional but can refine shadows within the character)
headMesh.castShadow = true;
torsoMesh.castShadow = true;
leftArmMesh.castShadow = true;
rightArmMesh.castShadow = true;
leftLegMesh.castShadow = true;
rightLegMesh.castShadow = true;

// Position Meshes relative to the Group origin (bottom center)
const torsoY = legLength + torsoHeight / 2;
torsoMesh.position.set(0, torsoY, 0);
headMesh.position.set(0, torsoY + torsoHeight / 2 + headSize / 2, 0);
leftArmMesh.position.set(-torsoWidth / 2 - armWidth / 2, torsoY + torsoHeight/2 - armLength / 2, 0);
rightArmMesh.position.set(torsoWidth / 2 + armWidth / 2, torsoY + torsoHeight/2 - armLength / 2, 0);
leftLegMesh.position.set(-torsoWidth / 4, legLength / 2, 0);
rightLegMesh.position.set(torsoWidth / 4, legLength / 2, 0);

// Add Meshes to the Group
characterGroup.add(headMesh);
characterGroup.add(torsoMesh);
characterGroup.add(leftArmMesh);
characterGroup.add(rightArmMesh);
characterGroup.add(leftLegMesh);
characterGroup.add(rightLegMesh);

// Movement and Turning variables (Now for the character)
let moveForward = false;
let moveBackward = false;
let turnLeft = false; // Renamed from moveLeft
let turnRight = false; // Renamed from moveRight

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3(); // Only z-component will be used now
const clock = new THREE.Clock(); // For delta time calculation

// --- Jump Button Handling (Moved to Global Scope) ---
// Moved here so it's accessible by keyboard listener
function handleJumpPress(event) {
    // Check if event exists and has preventDefault before calling it
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    if (canJump && !isJumping) {
        verticalVelocity = jumpStrength;
        isJumping = true;
        canJump = false;
        currentLevelJumps++; // Increment jump counter
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Remove old button references
    // const btnForward = document.getElementById('button-forward');
    // const btnBack = document.getElementById('button-back');
    // const btnLeft = document.getElementById('button-left');
    // const btnRight = document.getElementById('button-right');
    const btnJump = document.getElementById('button-jump');

    // New D-pad references
    const dPadContainer = document.getElementById('d-pad-container');
    const dPadKnob = document.getElementById('d-pad-knob');

    // Check if elements exist
    // if (!btnForward || !btnBack || !btnLeft || !btnRight || !btnJump || !dPadContainer || !dPadKnob) { // Adjusted check
    if (!btnJump || !dPadContainer || !dPadKnob) { // Simplified check
        console.error("One or more control elements not found in the DOM!");
        return; // Stop if elements aren't found
    }

    let isDragging = false;
    let activePointerId = null; // To track the specific touch/mouse pointer
    let dPadCenterX, dPadCenterY, dPadRadius;
    const knobMaxDisplacement = 30; // Max pixels the knob center can move from pad center
    const deadZone = 20; // Increased deadzone for less sensitivity

    function updateDPadDimensions() {
        const rect = dPadContainer.getBoundingClientRect();
        dPadCenterX = rect.left + rect.width / 2;
        dPadCenterY = rect.top + rect.height / 2;
        dPadRadius = rect.width / 2;
    }

    updateDPadDimensions(); // Initial calculation
    window.addEventListener('resize', updateDPadDimensions); // Recalculate on resize

    // --- Jump Button Listeners (uses globally defined handleJumpPress) ---
    btnJump.addEventListener('touchstart', handleJumpPress, { passive: false });
    btnJump.addEventListener('mousedown', handleJumpPress);

    // --- D-Pad Event Handling ---
    function handleDragStart(event) {
        if (isDragging) return; // Don't start a new drag if one is active
        event.preventDefault();
        isDragging = true;

        if (event.type === 'touchstart') {
            activePointerId = event.changedTouches[0].identifier;
            handleDragMove(event); // Process initial position
        } else if (event.type === 'mousedown') {
            activePointerId = 'mouse'; // Use a simple marker for mouse
            handleDragMove(event); // Process initial position
        }
        dPadContainer.style.opacity = '0.8';
    }

    function handleDragMove(event) {
        if (!isDragging) return;

        let currentPointer = null;

        if (event.type === 'touchmove') {
            for (let i = 0; i < event.changedTouches.length; i++) {
                if (event.changedTouches[i].identifier === activePointerId) {
                    currentPointer = event.changedTouches[i];
                    break;
                }
            }
            if (!currentPointer) return; // This move event is not for our tracked touch
        } else if (event.type === 'mousemove') {
            if (activePointerId !== 'mouse') return; // Not our mouse drag
            currentPointer = event;
        } else if (event.type === 'touchstart' || event.type === 'mousedown') {
            // Handle the initial move call from handleDragStart
            if (event.type === 'touchstart' && event.changedTouches[0].identifier === activePointerId) {
                 currentPointer = event.changedTouches[0];
            } else if (event.type === 'mousedown' && activePointerId === 'mouse') {
                 currentPointer = event;
            } else {
                return; // Initial call doesn't match active pointer?
            }
        } else {
             return; // Ignore other event types if they somehow get here
        }

        event.preventDefault(); // Prevent scroll/zoom only if we are processing the move

        const clientX = currentPointer.clientX;
        const clientY = currentPointer.clientY;
        const deltaX = clientX - dPadCenterX;
        const deltaY = clientY - dPadCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        let knobX = deltaX;
        let knobY = deltaY;

        // Clamp knob position within the max displacement radius
        if (distance > knobMaxDisplacement) {
            const ratio = knobMaxDisplacement / distance;
            knobX = deltaX * ratio;
            knobY = deltaY * ratio;
        }

        // Update knob visual position (relative to center)
        dPadKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

        // Determine movement flags based on knob position
        if (distance < deadZone) {
            // Inside deadzone - stop all movement
            moveForward = false;
            moveBackward = false;
            turnLeft = false;
            turnRight = false;
        } else {
            // Determine primary direction based on angle
            const angle = Math.atan2(deltaY, deltaX); // Y first for atan2, gives angle from positive X axis

            // Reset flags before setting
            moveForward = false;
            moveBackward = false;
            turnLeft = false;
            turnRight = false;

            // Define angle ranges (approximate quadrants)
            const forwardRange = [-Math.PI * 0.75, -Math.PI * 0.25]; // -135 to -45 degrees (Top)
            const backwardRange = [Math.PI * 0.25, Math.PI * 0.75];  // 45 to 135 degrees (Bottom)
            const rightRange = [-Math.PI * 0.25, Math.PI * 0.25];   // -45 to 45 degrees (Right)
            // Left range covers the wrap-around: (135 to 180 degrees) OR (-180 to -135 degrees)

            if (angle >= forwardRange[0] && angle <= forwardRange[1]) {
                moveForward = true;
            } else if (angle >= backwardRange[0] && angle <= backwardRange[1]) {
                moveBackward = true;
            } else if (angle >= rightRange[0] && angle <= rightRange[1]) {
                turnRight = true;
            } else { // Must be Left (angle > PI*0.75 or angle < -PI*0.75)
                turnLeft = true;
            }
        }
    }

    function handleDragEnd(event) {
        if (!isDragging) return;

        let pointerEnded = false;
        if (event.type === 'touchend' || event.type === 'touchcancel') {
            for (let i = 0; i < event.changedTouches.length; i++) {
                if (event.changedTouches[i].identifier === activePointerId) {
                    pointerEnded = true;
                    break;
                }
            }
        } else if (event.type === 'mouseup') {
            if (activePointerId === 'mouse') {
                pointerEnded = true;
            }
        }

        if (pointerEnded) {
            // event.preventDefault(); // Usually not needed on end
            isDragging = false;
            activePointerId = null; // Clear the tracked pointer
            moveForward = false;
            moveBackward = false;
            turnLeft = false;
            turnRight = false;
            dPadKnob.style.transform = 'translate(-50%, -50%)'; // Reset knob position
            dPadContainer.style.opacity = '0.5'; // Restore original opacity
        }
    }

    // Add D-Pad listeners
    dPadContainer.addEventListener('touchstart', handleDragStart, { passive: false });
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('touchcancel', handleDragEnd);

    dPadContainer.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    // Remove mouseleave on document - mouseup should handle drag end reliably enough
    // document.addEventListener('mouseleave', handleDragEnd); 

    // Remove old individual button listeners (commented out for clarity)
    /*
    function handlePointerDown(event, action) { ... }
    function handlePointerUp(event, action) { ... }
    btnForward.addEventListener('touchstart', (e) => handlePointerDown(e, 'forward'), { passive: false });
    // ... other old listeners ...
    */

}); // End of DOMContentLoaded listener

// --- Keyboard Controls --- (Now correctly uses global handleJumpPress)
const onKeyDown = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            turnLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            turnRight = true;
            break;
        case 'Space':
            // Trigger jump via the globally defined function
            handleJumpPress(null); // Pass null or a mock event if needed
            break;
    }
};

const onKeyUp = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            turnLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            turnRight = false;
            break;
        // No key up action needed for Space/Jump
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);
// --- End Keyboard Controls ---

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Get time difference between frames
    const elapsedTime = clock.getElapsedTime(); // Get total time elapsed
    const turnSpeed = Math.PI * 0.75; // Radians per second for turning
    const moveSpeed = 5.0; // Units per second for movement
    const legSwingFrequency = 15; // How fast the legs swing
    const legSwingAmplitude = Math.PI / 4; // How far legs swing

    // --- Update Moving Platform Positions --- 
    let playerOnMovingPlatformDelta = new THREE.Vector3(0, 0, 0); // Initialize delta for player on platform
    platformMeshes.forEach(platInfo => {
        if (platInfo.isMoving) {
            const oldPos = platInfo.mesh.position.clone(); // Store position before update

            // Calculate new position using a sine wave for smooth back/forth
            const oscillation = Math.sin(elapsedTime * platInfo.moveSpeed) * platInfo.moveDist;
            platInfo.mesh.position.copy(platInfo.initialPosition);
            if (platInfo.moveAxis === 'x') {
                platInfo.mesh.position.x += oscillation;
            } else if (platInfo.moveAxis === 'y') {
                platInfo.mesh.position.y += oscillation;
                // Update topY as well if moving vertically
                platInfo.topY = platInfo.mesh.position.y + platformHeight / 2;
            } else if (platInfo.moveAxis === 'z') {
                platInfo.mesh.position.z += oscillation;
            }

            // Calculate the movement delta for this frame
            platInfo.movementDelta = platInfo.mesh.position.clone().sub(oldPos);
        } else {
            platInfo.movementDelta = new THREE.Vector3(0, 0, 0); // No delta for static platforms
        }
    });

    // --- Apply Gravity and Update Vertical Position --- 
    verticalVelocity -= gravity * delta;
    let potentialY = characterGroup.position.y + verticalVelocity * delta;

    // --- Ground / Lava / Goal Check --- 
    const characterFeetY = potentialY; // Check potential position
    let landedSafely = false;
    let landedPlatformType = null;
    let targetPlatformY = 0; // To store the Y of the platform we landed on
    let landedPlatformInfo = null; // Store the info of the platform landed on

    if (verticalVelocity <= 0) { // Only check for landing if moving down or still
        for (const platInfo of platformMeshes) { // Use platInfo now
            const pData = platInfo.data;
            const platformTopY_end = platInfo.topY; // Use updated topY for moving platforms (End Y position)
            const charX = characterGroup.position.x; // Check current horizontal position
            const charZ = characterGroup.position.z;
            const halfWidth = pData.width / 2;
            const halfDepth = pData.depth / 2;
            const platformMeshPos = platInfo.mesh.position; // Use current mesh position (End X/Z position)

            // Calculate platform's vertical movement during this frame
            const platformDeltaY = platInfo.movementDelta ? platInfo.movementDelta.y : 0;
            // Calculate platform's top Y at the START of this frame
            const platformTopY_start = platformTopY_end - platformDeltaY;

            // Player's vertical position at the START of this frame
            const playerY_start = characterGroup.position.y;
            // Player's potential vertical position at the END of this frame (before snapping)
            // Note: potentialY already includes verticalVelocity * delta
            const playerY_end_potential = potentialY;

            // Check if horizontally aligned
            const isHorizontallyAligned = (
                charX >= platformMeshPos.x - halfWidth && charX <= platformMeshPos.x + halfWidth &&
                charZ >= platformMeshPos.z - halfDepth && charZ <= platformMeshPos.z + halfDepth
            );

            // --- Refined Vertical Collision Check with Tolerance ---
            const epsilon = 0.01; // Small tolerance for floating point comparisons

            // Check for collision based on start and end positions relative to the platform
            if (isHorizontallyAligned &&
                playerY_start >= platformTopY_start - epsilon && // Player started at or slightly below platform start top
                playerY_end_potential <= platformTopY_end + epsilon) { // Player ended (potentially) at or slightly above platform end top
                
                landedSafely = true;
                landedPlatformType = pData.type;
                targetPlatformY = platformTopY_end; // Land ON the platform's final position
                potentialY = platformTopY_end; // Snap potential position to the platform top (no epsilon here)
                verticalVelocity = 0;
                isJumping = false;
                canJump = true;
                landedPlatformInfo = platInfo; // Store the landed platform's info
                break; // Landed on this platform
            }
        }
    }

    // Update actual vertical position
    characterGroup.position.y = potentialY;

    // --- Apply Horizontal Movement from Platform (if landed on one) ---
    // Apply this *after* vertical position is set, but *before* player input movement
    if (landedPlatformInfo && landedPlatformInfo.isMoving) {
        characterGroup.position.x += landedPlatformInfo.movementDelta.x;
        characterGroup.position.z += landedPlatformInfo.movementDelta.z;
    }

    // --- Handle Landing Results --- 
    if (landedSafely) {
        // Check if it's the goal platform
        if (landedPlatformType === 'goal') {
            console.log("Reached the goal!");
            
            // Calculate level score based on jumps/resets
            let levelScore = Math.max(0, 10 - currentLevelJumps - currentLevelResets);
            console.log(`Level ${currentLevelIndex} Score (Performance): ${levelScore} (Jumps: ${currentLevelJumps}, Resets: ${currentLevelResets})`);
            totalScore += levelScore;

            // Add bonus points for completing the level
            const levelCompletionBonus = 10;
            totalScore += levelCompletionBonus;
            console.log(`Added ${levelCompletionBonus} bonus points for completing the level. New Total Score: ${totalScore}`);

            updateScoreDisplay(); // Update the scoreboard UI

            currentLevelIndex++;
            loadLevel(currentLevelIndex); // Load next level
            // Skip rest of frame logic to avoid issues with reset character state
            return; 
        }
        // Otherwise, regular landing logic (like enabling jump) already done in the loop
    } else {
        // Didn't land on a platform, are we in the lava?
        if (characterFeetY < lavaLevelY + 0.1) { // Check against actual position (potentialY)
            currentLevelResets++; // Increment reset counter
            resetPlayer(); // Resets position and velocity
            // Skip rest of frame logic
            return;
        }
        // If not in lava, just continue falling - maybe disable jump if just fell off edge
        if (characterGroup.position.y < startPosition.y - 0.1) { // Simple check if fell off start/any platform edge
             canJump = false;
        }
    }
    
    // Update canJump based on vertical velocity (simplest check)
    // If we are moving up or significantly down, we can't jump
    // We set canJump = true upon landing.
    if (verticalVelocity > 0.1 || verticalVelocity < -0.1) {
        canJump = false;
    }

    // Character Turning
    if (turnLeft) {
        characterGroup.rotateY(turnSpeed * delta);
    }
    if (turnRight) {
        characterGroup.rotateY(-turnSpeed * delta);
    }

    // Character Movement
    const characterDirection = new THREE.Vector3();
    characterGroup.getWorldDirection(characterDirection);
    let isMoving = false; // Flag to check if character moved this frame

    if (moveForward) {
        characterGroup.position.addScaledVector(characterDirection, moveSpeed * delta);
        isMoving = true;
    }
    if (moveBackward) {
        characterGroup.position.addScaledVector(characterDirection, -moveSpeed * delta);
        isMoving = true;
    }

    // --- Animation --- 
    if (isMoving) {
        // Leg Swinging Animation
        const swingAngle = Math.sin(elapsedTime * legSwingFrequency) * legSwingAmplitude;
        leftLegMesh.rotation.x = swingAngle;
        rightLegMesh.rotation.x = -swingAngle;
    } else {
        // Reset legs when not moving
        leftLegMesh.rotation.x = 0;
        rightLegMesh.rotation.x = 0;
    }

    // Camera Following (Chase Cam)
    const fixedCameraOffset = new THREE.Vector3(0, 3, -6); // Fixed Offset behind and above in character local space
    const desiredCameraPosition = new THREE.Vector3();
    const worldOffset = new THREE.Vector3(); // Temporary vector for calculation
    const characterWorldPosition = new THREE.Vector3();
    const characterWorldQuaternion = new THREE.Quaternion();

    // 1. Get character's world position & rotation
    characterGroup.getWorldPosition(characterWorldPosition);
    characterGroup.getWorldQuaternion(characterWorldQuaternion);

    // 2. Apply character's rotation to the fixed offset
    worldOffset.copy(fixedCameraOffset);
    worldOffset.applyQuaternion(characterWorldQuaternion);

    // 3. Add rotated offset to character's world position
    desiredCameraPosition.copy(characterWorldPosition).add(worldOffset);
    
    // Smoothly interpolate camera position (lerp)
    camera.position.lerp(desiredCameraPosition, delta * 5.0); // Adjust the 5.0 for faster/slower follow

    // Make camera look at the character
    camera.lookAt(characterWorldPosition);

    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Initial Load ---
loadLevel(currentLevelIndex); // Load the first level initially 
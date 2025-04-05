import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// Voxel World Explorer - Main JavaScript File

console.log("Game starting...");

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Add a sky-blue background
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });

renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement); // Append renderer to body - Removed as renderer uses existing canvas

// UI Element Reference
const levelDisplayElement = document.getElementById('level-display');

// --- Materials ---
const platformMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc }); // Grey platforms
const startPlatformMaterial = new THREE.MeshBasicMaterial({ color: 0xccffcc }); // Light green start
const goalPlatformMaterial = new THREE.MeshBasicMaterial({ color: 0xffccaa }); // Light orange goal
const lavaMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500, side: THREE.DoubleSide }); // Red-orange lava

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
    ]
];

let currentLevelIndex = 0;
let platformMeshes = []; // To hold meshes of the current level
let startPosition = new THREE.Vector3(0, platformHeight, 0); // Will be updated by loadLevel

// Jumping variables (Moved Up)
const gravity = 9.8; 
const jumpStrength = 9.0; // Increased jump strength
let verticalVelocity = 0;
let isJumping = false;
let canJump = false; // Make canJump global

// --- Generate Level Geometry ---
function loadLevel(levelIndex) {
    // Clear previous level's meshes
    platformMeshes.forEach(p => scene.remove(p.mesh));
    platformMeshes = [];

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

        scene.add(platformMesh);
        // Store mesh, data, and calculated top Y for collision checks
        platformMeshes.push({ mesh: platformMesh, data: pData, topY: platformTopY }); 
    });

    resetPlayer(); // Place player at the start of the loaded level
}

// Add Lava Plane
const lavaSize = 50; // Make it large enough to cover potential area
const lavaGeo = new THREE.PlaneGeometry(lavaSize, lavaSize);
const lavaMesh = new THREE.Mesh(lavaGeo, lavaMaterial);
lavaMesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
lavaMesh.position.y = lavaLevelY;   // Position it below platforms
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
scene.add(characterGroup);
// resetPlayer(); // Initial position is now set by loadLevel

// Character Materials (Simple colors for now)
const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffdbac }); // Skin tone
const torsoMaterial = new THREE.MeshBasicMaterial({ color: 0x0055ff }); // Blue shirt
const legsMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 }); // Dark pants

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

// Set initial character group position (bottom center at world origin)
// const characterBaseY = 0; // Character origin is now at feet level - Platforms define height now
// characterGroup.position.set(0, characterBaseY, 0);

// Movement and Turning variables (Now for the character)
let moveForward = false;
let moveBackward = false;
let turnLeft = false; // Renamed from moveLeft
let turnRight = false; // Renamed from moveRight

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3(); // Only z-component will be used now
const clock = new THREE.Clock(); // For delta time calculation

// Keyboard event listeners
const onKeyDown = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            turnLeft = true; // Changed from moveLeft
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            turnRight = true; // Changed from moveRight
            break;
        case 'Space':
            if (canJump && !isJumping) { 
                verticalVelocity = jumpStrength;
                isJumping = true;
                canJump = false; // Prevent double-jumping in same frame/before leaving ground
            }
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
            turnLeft = false; // Changed from moveLeft
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            turnRight = false; // Changed from moveRight
            break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// --- On-Screen Controls Logic ---

// Wrap DOM-dependent code in DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    const btnForward = document.getElementById('button-forward');
    const btnBack = document.getElementById('button-back');
    const btnLeft = document.getElementById('button-left');
    const btnRight = document.getElementById('button-right');
    const btnJump = document.getElementById('button-jump');

    // Check if buttons exist before adding listeners
    if (!btnForward || !btnBack || !btnLeft || !btnRight || !btnJump) {
        console.error("One or more control buttons not found in the DOM!");
        return; // Stop if buttons aren't found
    }

    function handlePointerDown(event, action) {
        event.preventDefault(); // Prevent default touch behaviors (scrolling, zooming)
        switch (action) {
            case 'forward': moveForward = true; break;
            case 'back': moveBackward = true; break;
            case 'left': turnLeft = true; break;
            case 'right': turnRight = true; break;
            case 'jump':
                if (canJump && !isJumping) {
                    verticalVelocity = jumpStrength;
                    isJumping = true;
                    canJump = false;
                }
                break;
        }
    }

    function handlePointerUp(event, action) {
        event.preventDefault();
        switch (action) {
            case 'forward': moveForward = false; break;
            case 'back': moveBackward = false; break;
            case 'left': turnLeft = false; break;
            case 'right': turnRight = false; break;
            // No action needed for jump on release
        }
    }

    // Add listeners for both touch and mouse events
    btnForward.addEventListener('touchstart', (e) => handlePointerDown(e, 'forward'), { passive: false });
    btnForward.addEventListener('touchend', (e) => handlePointerUp(e, 'forward'), { passive: false });
    btnForward.addEventListener('mousedown', (e) => handlePointerDown(e, 'forward'));
    btnForward.addEventListener('mouseup', (e) => handlePointerUp(e, 'forward'));
    btnForward.addEventListener('mouseleave', (e) => handlePointerUp(e, 'forward')); // Stop moving if pointer leaves button

    btnBack.addEventListener('touchstart', (e) => handlePointerDown(e, 'back'), { passive: false });
    btnBack.addEventListener('touchend', (e) => handlePointerUp(e, 'back'), { passive: false });
    btnBack.addEventListener('mousedown', (e) => handlePointerDown(e, 'back'));
    btnBack.addEventListener('mouseup', (e) => handlePointerUp(e, 'back'));
    btnBack.addEventListener('mouseleave', (e) => handlePointerUp(e, 'back'));

    btnLeft.addEventListener('touchstart', (e) => handlePointerDown(e, 'left'), { passive: false });
    btnLeft.addEventListener('touchend', (e) => handlePointerUp(e, 'left'), { passive: false });
    btnLeft.addEventListener('mousedown', (e) => handlePointerDown(e, 'left'));
    btnLeft.addEventListener('mouseup', (e) => handlePointerUp(e, 'left'));
    btnLeft.addEventListener('mouseleave', (e) => handlePointerUp(e, 'left'));

    btnRight.addEventListener('touchstart', (e) => handlePointerDown(e, 'right'), { passive: false });
    btnRight.addEventListener('touchend', (e) => handlePointerUp(e, 'right'), { passive: false });
    btnRight.addEventListener('mousedown', (e) => handlePointerDown(e, 'right'));
    btnRight.addEventListener('mouseup', (e) => handlePointerUp(e, 'right'));
    btnRight.addEventListener('mouseleave', (e) => handlePointerUp(e, 'right'));

    btnJump.addEventListener('touchstart', (e) => handlePointerDown(e, 'jump'), { passive: false });
    // No touchend/mouseup needed for jump, it's a single action trigger
    btnJump.addEventListener('mousedown', (e) => handlePointerDown(e, 'jump'));
}); // End of DOMContentLoaded listener

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Get time difference between frames
    const elapsedTime = clock.getElapsedTime(); // Get total time elapsed
    const turnSpeed = Math.PI * 0.75; // Radians per second for turning
    const moveSpeed = 5.0; // Units per second for movement
    const bobFrequency = 10; // How fast the bobbing happens - WILL BE REMOVED
    const bobAmplitude = 0.1; // How high the character bobs - WILL BE REMOVED
    const legSwingFrequency = 15; // How fast the legs swing
    const legSwingAmplitude = Math.PI / 4; // How far legs swing (in radians, e.g., 45 degrees)

    // --- Apply Gravity and Update Vertical Position --- 
    verticalVelocity -= gravity * delta;
    let potentialY = characterGroup.position.y + verticalVelocity * delta;

    // --- Ground / Lava / Goal Check --- 
    const characterFeetY = potentialY; // Check potential position
    let landedSafely = false;
    let landedPlatformType = null;
    let targetPlatformY = 0; // To store the Y of the platform we landed on

    if (verticalVelocity <= 0) { // Only check for landing if moving down or still
        for (const plat of platformMeshes) {
            const pData = plat.data;
            const platformTopY = plat.topY;
            const charX = characterGroup.position.x; // Check current horizontal position
            const charZ = characterGroup.position.z;
            const halfWidth = pData.width / 2;
            const halfDepth = pData.depth / 2;

            // Check if horizontally aligned AND feet are about to pass through the platform top
            if (charX >= pData.x - halfWidth && charX <= pData.x + halfWidth &&
                charZ >= pData.z - halfDepth && charZ <= pData.z + halfDepth &&
                characterGroup.position.y >= platformTopY && // Current pos is above or at platform
                characterFeetY <= platformTopY) { // Potential pos is below or at platform
                
                landedSafely = true;
                landedPlatformType = pData.type;
                targetPlatformY = platformTopY;
                potentialY = platformTopY; // Snap potential position to the platform top
                verticalVelocity = 0;
                isJumping = false;
                canJump = true;
                break; // Landed on this platform
            }
        }
    }

    // Update actual position
    characterGroup.position.y = potentialY;

    // --- Handle Landing Results --- 
    if (landedSafely) {
        // Check if it's the goal platform
        if (landedPlatformType === 'goal') {
            console.log("Reached the goal!");
            currentLevelIndex++;
            loadLevel(currentLevelIndex); // Load next level
            // Skip rest of frame logic to avoid issues with reset character state
            return; 
        }
        // Otherwise, regular landing logic (like enabling jump) already done in the loop
    } else {
        // Didn't land on a platform, are we in the lava?
        if (characterFeetY < lavaLevelY + 0.1) { // Check against actual position (potentialY)
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

        // REMOVE Bobbing Animation
        // characterGroup.position.y = characterBaseY + Math.sin(elapsedTime * bobFrequency) * bobAmplitude;
    } else {
        // Reset legs when not moving
        leftLegMesh.rotation.x = 0;
        rightLegMesh.rotation.x = 0;

        // Ensure character is at base height when stopped - REMOVED (Handled by gravity/jump logic)
        // characterGroup.position.y = characterBaseY;
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
    
    // Calculate desired position based on character's rotation and position - OLD METHOD REMOVED
    // desiredCameraPosition.copy(characterGroup.position)
    //                    .add(desiredCameraOffset.applyMatrix4(characterGroup.matrixWorld)); // Apply character's world transform to offset

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
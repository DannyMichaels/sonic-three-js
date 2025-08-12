// 3D Sonic Game using Three.js
let scene, camera, renderer;
let sonic, rings = [], enemies = [], platforms = [];
let clock, mixer;
let keys = {};
let gameState = {
    score: 0,
    rings: 0,
    speed: 0,
    boost: 100,
    isJumping: false,
    velocity: new THREE.Vector3(0, 0, 0),
    lives: 3,
    isDead: false,
    levelComplete: false,
    checkpointPosition: new THREE.Vector3(0, 3, 0),
    invulnerable: false,
    invulnerableTime: 0
};

let waterMesh, endGoal;

// Music system
let audioContext, musicSequencer;
let midiSynths = [];
let isMusicPlaying = false;

// Constants
const GRAVITY = -30;
const JUMP_FORCE = 20;
const MAX_SPEED = 150;  // Much faster!
const ACCELERATION = 2.5;  // Quicker acceleration
const FRICTION = 0.95;  // Less friction for more speed
const BOOST_SPEED = 300;  // SUPER FAST boost

// Mobile controls state
let touchState = {
    joystick: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0
    },
    jump: false,
    boost: false,
    camera: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    }
};

// Initialize Three.js
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 10, 500);
    
    // Create camera with fish-eye effect (wide FOV like Sonic X-Treme)
    camera = new THREE.PerspectiveCamera(
        120,  // Super wide FOV for fish-eye effect
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 15, 25);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87CEEB);
    document.body.appendChild(renderer.domElement);
    
    // Add lights
    setupLights();
    
    // Create Sonic character
    createSonic();
    
    // Create Jade Gully level
    createJadeGullyLevel();
    
    // Create collectibles
    createRings();
    
    // Create enemies
    createEnemies();
    
    // Setup controls
    setupControls();
    
    // Clock for animations
    clock = new THREE.Clock();
    
    // Initialize music system (but don't start yet)
    initMusic();
    
    // Hide loading, show main menu
    document.getElementById('loading').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'block';
    
    // Setup start button
    document.getElementById('startButton').addEventListener('click', startGame);
}

function startGame() {
    // Hide menu
    document.getElementById('mainMenu').style.display = 'none';
    
    // Show game UI
    document.getElementById('ui').style.display = 'block';
    document.getElementById('controls').style.display = 'block';
    
    // Initialize audio context if needed
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Start music automatically
    startMusic();
    
    // Start game loop
    animate();
}

function setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    
    // Hemisphere light for better ambience
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x545454, 0.4);
    scene.add(hemiLight);
}

function createSonic() {
    // Create normal-sized classic Sonic
    const sonicGroup = new THREE.Group();
    
    // Body (blue sphere - compact)
    const bodyGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1E90FF,  // Classic Sonic blue
        shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    sonicGroup.add(body);
    
    // Head (sphere on top)
    const headGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 1.8;
    head.castShadow = true;
    sonicGroup.add(head);
    
    // Eyes (classic Sonic style)
    const eyeGeometry = new THREE.SphereGeometry(0.4, 12, 12);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const eyePupilMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.4, 2, 0.9);
    sonicGroup.add(leftEye);
    
    const leftPupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        eyePupilMaterial
    );
    leftPupil.position.set(-0.4, 2, 1.1);
    sonicGroup.add(leftPupil);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.4, 2, 0.9);
    sonicGroup.add(rightEye);
    
    const rightPupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        eyePupilMaterial
    );
    rightPupil.position.set(0.4, 2, 1.1);
    sonicGroup.add(rightPupil);
    
    // Nose
    const noseGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const noseMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 1.7, 1.2);
    sonicGroup.add(nose);
    
    // Spikes (classic blue spikes)
    const spikeGeometry = new THREE.ConeGeometry(0.4, 1.5, 4);
    const spikeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1560BD
    });
    
    // Back spikes
    for (let i = 0; i < 3; i++) {
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        spike.position.set(0, 2 - i * 0.4, -1.2 - i * 0.3);
        spike.rotation.x = -Math.PI / 4;
        spike.castShadow = true;
        sonicGroup.add(spike);
    }
    
    // Side spikes
    const leftSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    leftSpike.position.set(-1.2, 1.8, -0.5);
    leftSpike.rotation.z = Math.PI / 4;
    leftSpike.castShadow = true;
    sonicGroup.add(leftSpike);
    
    const rightSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    rightSpike.position.set(1.2, 1.8, -0.5);
    rightSpike.rotation.z = -Math.PI / 4;
    rightSpike.castShadow = true;
    sonicGroup.add(rightSpike);
    
    // Arms (small spheres)
    const armGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0x1E90FF });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-1.2, 0, 0);
    leftArm.scale.y = 1.5;
    leftArm.castShadow = true;
    sonicGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(1.2, 0, 0);
    rightArm.scale.y = 1.5;
    rightArm.castShadow = true;
    sonicGroup.add(rightArm);
    
    // Legs (small cylinders)
    const legGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x1E90FF });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.5, -1, 0);
    leftLeg.castShadow = true;
    sonicGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.5, -1, 0);
    rightLeg.castShadow = true;
    sonicGroup.add(rightLeg);
    
    // Shoes (classic red)
    const shoeGeometry = new THREE.BoxGeometry(0.8, 0.6, 1.2);
    const shoeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        shininess: 80
    });
    
    const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
    leftShoe.position.set(-0.5, -1.8, 0.2);
    leftShoe.castShadow = true;
    sonicGroup.add(leftShoe);
    
    const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
    rightShoe.position.set(0.5, -1.8, 0.2);
    rightShoe.castShadow = true;
    sonicGroup.add(rightShoe);
    
    // White stripes on shoes
    const stripeGeometry = new THREE.BoxGeometry(0.85, 0.1, 1.25);
    const stripeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    
    const leftStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    leftStripe.position.set(-0.5, -1.8, 0.2);
    sonicGroup.add(leftStripe);
    
    const rightStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    rightStripe.position.set(0.5, -1.8, 0.2);
    sonicGroup.add(rightStripe);
    
    // Gloves (white)
    const gloveGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const gloveMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    
    const leftGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
    leftGlove.position.set(-1.2, -0.5, 0);
    leftGlove.castShadow = true;
    sonicGroup.add(leftGlove);
    
    const rightGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
    rightGlove.position.set(1.2, -0.5, 0);
    rightGlove.castShadow = true;
    sonicGroup.add(rightGlove);
    
    sonicGroup.position.y = 3;  // Normal starting height
    sonic = sonicGroup;
    scene.add(sonic);
}

function createJadeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Create jade pattern
    const gradient = context.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#00aa77');
    gradient.addColorStop(0.5, '#00ff99');
    gradient.addColorStop(1, '#00cc88');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    
    // Add some texture
    for (let i = 0; i < 50; i++) {
        context.strokeStyle = `rgba(0, ${Math.random() * 100 + 155}, ${Math.random() * 50 + 100}, 0.1)`;
        context.beginPath();
        context.moveTo(Math.random() * 256, 0);
        context.lineTo(Math.random() * 256, 256);
        context.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function createJadeGullyLevel() {
    // Jade Gully - Green crystalline level with water hazards
    
    // Set jade/aqua color scheme
    scene.fog = new THREE.Fog(0x00aa88, 10, 500);
    renderer.setClearColor(0x006644);
    
    // Create water plane at the bottom (death zone)
    const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
    const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x0088ff,
        emissive: 0x004488,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8,
        shininess: 100
    });
    waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -20;
    scene.add(waterMesh);
    
    // Animate water
    const animateWater = () => {
        waterMesh.position.y = -20 + Math.sin(Date.now() * 0.001) * 2;
        requestAnimationFrame(animateWater);
    };
    animateWater();
    
    // Main jade platform materials
    const jadeTexture = createJadeTexture();
    const jadeMaterial = new THREE.MeshPhongMaterial({
        map: jadeTexture,
        color: 0x00ff88,
        emissive: 0x004422,
        emissiveIntensity: 0.2,
        shininess: 80
    });
    
    // Starting platform
    const startPlatform = new THREE.Mesh(
        new THREE.BoxGeometry(40, 2, 40),
        jadeMaterial
    );
    startPlatform.position.set(0, 0, 0);
    startPlatform.castShadow = true;
    startPlatform.receiveShadow = true;
    scene.add(startPlatform);
    platforms.push(startPlatform);
    
    // Create loop-de-loop
    const loopRadius = 30;
    for (let i = 0; i <= 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const loopPlatform = new THREE.Mesh(
            new THREE.BoxGeometry(15, 3, 10),
            jadeMaterial
        );
        loopPlatform.position.x = -60;
        loopPlatform.position.y = loopRadius + Math.sin(angle) * loopRadius;
        loopPlatform.position.z = -40 + Math.cos(angle) * loopRadius;
        loopPlatform.rotation.x = angle;
        loopPlatform.castShadow = true;
        scene.add(loopPlatform);
        platforms.push(loopPlatform);
    }
    
    // Floating jade platforms path
    const platformPositions = [
        {x: 40, y: 5, z: -20},
        {x: 60, y: 10, z: -40},
        {x: 80, y: 15, z: -60},
        {x: 100, y: 10, z: -80},
        {x: 120, y: 20, z: -100},
        {x: 140, y: 25, z: -120},
        {x: 160, y: 15, z: -140},
        {x: 180, y: 30, z: -160},
        {x: 200, y: 35, z: -180},
        {x: 220, y: 40, z: -200} // End platform
    ];
    
    platformPositions.forEach((pos, index) => {
        const size = index === platformPositions.length - 1 ? 60 : 30; // Bigger end platform
        const platform = new THREE.Mesh(
            new THREE.CylinderGeometry(size/2, size/2 + 5, 3, 6),
            jadeMaterial
        );
        platform.position.set(pos.x, pos.y, pos.z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        platforms.push(platform);
        
        // Animate floating platforms
        if (index % 2 === 0) {
            const animatePlatform = () => {
                platform.position.y = pos.y + Math.sin(Date.now() * 0.001 + index) * 3;
                requestAnimationFrame(animatePlatform);
            };
            animatePlatform();
        }
    });
    
    // Create bridges
    for (let i = 0; i < 3; i++) {
        const bridgeGeometry = new THREE.BoxGeometry(20, 1, 60);
        const bridge = new THREE.Mesh(bridgeGeometry, jadeMaterial);
        bridge.position.set(
            -30 + i * 30,
            5 + i * 5,
            -100 - i * 30
        );
        bridge.rotation.y = Math.PI / 6;
        bridge.castShadow = true;
        scene.add(bridge);
        platforms.push(bridge);
    }
    
    // Add jade crystals as decoration
    for (let i = 0; i < 15; i++) {
        const crystalGeometry = new THREE.OctahedronGeometry(5, 0);
        const crystalMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffaa,
            emissive: 0x00aa55,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        crystal.position.set(
            (Math.random() - 0.5) * 300,
            Math.random() * 50,
            -Math.random() * 250
        );
        crystal.scale.y = 2;
        scene.add(crystal);
        
        // Rotate crystals
        const animateCrystal = () => {
            crystal.rotation.y += 0.01;
            requestAnimationFrame(animateCrystal);
        };
        animateCrystal();
    }
    
    // Create END GOAL
    const goalGeometry = new THREE.CylinderGeometry(10, 10, 30, 8);
    const goalMaterial = new THREE.MeshPhongMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.5
    });
    endGoal = new THREE.Mesh(goalGeometry, goalMaterial);
    endGoal.position.set(220, 50, -200);
    scene.add(endGoal);
    
    // Add spinning star on top of goal
    const starGeometry = new THREE.OctahedronGeometry(5, 0);
    const starMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffdd00,
        emissiveIntensity: 0.8
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(220, 70, -200);
    scene.add(star);
    
    // Animate goal
    const animateGoal = () => {
        endGoal.rotation.y += 0.02;
        star.rotation.y += 0.05;
        star.rotation.x += 0.03;
        star.position.y = 70 + Math.sin(Date.now() * 0.002) * 3;
        requestAnimationFrame(animateGoal);
    };
    animateGoal();
}

function createRings() {
    const ringGeometry = new THREE.TorusGeometry(1.5, 0.3, 8, 16);
    const ringMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.3
    });
    
    // Create ring trail along the path
    for (let i = 0; i < 10; i++) {
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(
            -30 + i * 6,
            5,
            -20
        );
        ring.castShadow = true;
        scene.add(ring);
        rings.push(ring);
    }
    
    // Create ring circle
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(
            Math.cos(angle) * 10,
            15,
            -60 + Math.sin(angle) * 10
        );
        ring.castShadow = true;
        scene.add(ring);
        rings.push(ring);
    }
    
    // Vertical rings
    for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(30, 8 + i * 3, -20);
        ring.castShadow = true;
        scene.add(ring);
        rings.push(ring);
    }
}

function createEnemies() {
    // Create Jade Gully enemies (badniks)
    const enemyGeometry = new THREE.BoxGeometry(3, 2, 3);
    const enemyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFF0000,
        emissive: 0x880000,
        emissiveIntensity: 0.2
    });
    
    // Place enemies strategically on platforms
    const enemyPositions = [
        {x: 20, y: 2, z: -10},
        {x: 50, y: 12, z: -35},
        {x: 70, y: 17, z: -50},
        {x: 90, y: 12, z: -70},
        {x: 110, y: 22, z: -90},
        {x: 130, y: 27, z: -110},
        {x: 150, y: 17, z: -130},
        {x: 170, y: 32, z: -150},
        {x: -50, y: 32, z: -35},
        {x: -20, y: 7, z: -85}
    ];
    
    enemyPositions.forEach((pos, i) => {
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemy.position.set(pos.x, pos.y, pos.z);
        enemy.castShadow = true;
        enemy.receiveShadow = true;
        enemy.userData = { 
            speed: 0.3 + Math.random() * 0.3,
            direction: Math.random() * Math.PI * 2,
            initialPos: {...pos},
            patrolRadius: 10 + Math.random() * 10
        };
        
        // Add eyes to enemies
        const eyeGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const eyeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.5, 0.5, 1.5);
        enemy.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.5, 0.5, 1.5);
        enemy.add(rightEye);
        
        scene.add(enemy);
        enemies.push(enemy);
    });
}

function createCheckerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    const size = 32;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            context.fillStyle = (i + j) % 2 === 0 ? '#228B22' : '#32CD32';
            context.fillRect(i * size, j * size, size, size);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    return texture;
}

function setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse controls for camera
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    
    // Setup mobile touch controls
    setupMobileControls();
    
    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function setupMobileControls() {
    // Check if touch is supported
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (!isTouchDevice) return;
    
    // Joystick controls
    const joystick = document.getElementById('touchJoystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const joystickBase = joystick.querySelector('.joystick-base');
    
    if (joystick) {
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = joystickBase.getBoundingClientRect();
            touchState.joystick.active = true;
            touchState.joystick.startX = rect.left + rect.width / 2;
            touchState.joystick.startY = rect.top + rect.height / 2;
            handleJoystickMove(touch.clientX, touch.clientY);
        });
        
        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!touchState.joystick.active) return;
            const touch = e.touches[0];
            handleJoystickMove(touch.clientX, touch.clientY);
        });
        
        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchState.joystick.active = false;
            touchState.joystick.deltaX = 0;
            touchState.joystick.deltaY = 0;
            // Reset knob position
            joystickKnob.style.transform = 'translate(-50%, -50%)';
        });
    }
    
    function handleJoystickMove(touchX, touchY) {
        const maxDistance = 60; // Maximum distance from center
        let deltaX = touchX - touchState.joystick.startX;
        let deltaY = touchY - touchState.joystick.startY;
        
        // Limit to circular area
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }
        
        // Update knob position
        joystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        
        // Store normalized values (-1 to 1)
        touchState.joystick.deltaX = deltaX / maxDistance;
        touchState.joystick.deltaY = deltaY / maxDistance;
    }
    
    // Jump button
    const jumpButton = document.getElementById('jumpButton');
    if (jumpButton) {
        jumpButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchState.jump = true;
        });
        
        jumpButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchState.jump = false;
        });
    }
    
    // Boost button
    const boostButton = document.getElementById('boostButton');
    if (boostButton) {
        boostButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchState.boost = true;
        });
        
        boostButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchState.boost = false;
        });
    }
    
    // Music button
    const musicButton = document.getElementById('musicButton');
    if (musicButton) {
        musicButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            toggleMusic();
        });
    }
    
    // Camera touch controls (swipe on screen)
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchState.camera.active = true;
            touchState.camera.startX = e.touches[0].clientX;
            touchState.camera.startY = e.touches[0].clientY;
            touchState.camera.currentX = 0;
            touchState.camera.currentY = 0;
        }
    });
    
    renderer.domElement.addEventListener('touchmove', (e) => {
        if (touchState.camera.active && e.touches.length === 1) {
            e.preventDefault();
            const deltaX = e.touches[0].clientX - touchState.camera.startX;
            const deltaY = e.touches[0].clientY - touchState.camera.startY;
            touchState.camera.currentX = deltaX * 0.01;
            touchState.camera.currentY = deltaY * 0.01;
        }
    });
    
    renderer.domElement.addEventListener('touchend', (e) => {
        touchState.camera.active = false;
        touchState.camera.currentX = 0;
        touchState.camera.currentY = 0;
    });
}

function updateSonic(deltaTime) {
    if (gameState.isDead || gameState.levelComplete) return;
    
    // Handle input (keyboard + touch)
    let moveX = 0;
    let moveZ = 0;
    
    // Keyboard input
    if (keys['w'] || keys['arrowup']) moveZ = -1;
    if (keys['s'] || keys['arrowdown']) moveZ = 1;
    if (keys['a'] || keys['arrowleft']) moveX = -1;
    if (keys['d'] || keys['arrowright']) moveX = 1;
    
    // Touch joystick input (override keyboard if active)
    if (touchState.joystick.active) {
        moveX = touchState.joystick.deltaX;
        moveZ = touchState.joystick.deltaY;
    }
    
    // Apply acceleration
    const isBoosting = keys['shift'] || touchState.boost;
    const speed = isBoosting ? BOOST_SPEED : MAX_SPEED;
    gameState.velocity.x += moveX * ACCELERATION;
    gameState.velocity.z += moveZ * ACCELERATION;
    
    // Limit speed
    const horizontalVelocity = new THREE.Vector2(
        gameState.velocity.x,
        gameState.velocity.z
    );
    if (horizontalVelocity.length() > speed) {
        horizontalVelocity.normalize().multiplyScalar(speed);
        gameState.velocity.x = horizontalVelocity.x;
        gameState.velocity.z = horizontalVelocity.y;
    }
    
    // Apply friction
    gameState.velocity.x *= FRICTION;
    gameState.velocity.z *= FRICTION;
    
    // Jump (keyboard or touch)
    if ((keys[' '] || touchState.jump) && !gameState.isJumping) {
        gameState.velocity.y = JUMP_FORCE;
        gameState.isJumping = true;
    }
    
    // Apply gravity
    gameState.velocity.y += GRAVITY * deltaTime;
    
    // Update position
    sonic.position.x += gameState.velocity.x * deltaTime;
    sonic.position.y += gameState.velocity.y * deltaTime;
    sonic.position.z += gameState.velocity.z * deltaTime;
    
    // Platform collision detection
    let onPlatform = false;
    let platformTop = -100; // Default to very low
    
    platforms.forEach(platform => {
        if (!platform.geometry) return;
        
        // Get platform bounding box
        const platformBox = new THREE.Box3().setFromObject(platform);
        
        // Create a box for Sonic
        const sonicBox = new THREE.Box3().setFromCenterAndSize(
            sonic.position,
            new THREE.Vector3(3, 3, 3)
        );
        
        // Check if Sonic is above and within platform bounds
        const xOverlap = sonic.position.x >= platformBox.min.x && sonic.position.x <= platformBox.max.x;
        const zOverlap = sonic.position.z >= platformBox.min.z && sonic.position.z <= platformBox.max.z;
        
        if (xOverlap && zOverlap) {
            // Check if Sonic is falling onto platform
            if (sonic.position.y <= platformBox.max.y + 2 && 
                sonic.position.y >= platformBox.max.y - 5 &&
                gameState.velocity.y <= 0) {
                onPlatform = true;
                platformTop = Math.max(platformTop, platformBox.max.y);
            }
        }
    });
    
    // Apply platform collision
    if (onPlatform) {
        sonic.position.y = platformTop + 2;
        gameState.velocity.y = 0;
        gameState.isJumping = false;
    } else if (sonic.position.y <= 3) {
        // Ground collision (base level)
        sonic.position.y = 3;
        gameState.velocity.y = 0;
        gameState.isJumping = false;
    }
    
    // Check if fell into water (death)
    if (sonic.position.y < -15) {
        handleDeath();
    }
    
    // Check if reached end goal
    if (endGoal) {
        const distanceToGoal = sonic.position.distanceTo(endGoal.position);
        if (distanceToGoal < 15) {
            handleLevelComplete();
        }
    }
    
    // Rotate Sonic based on movement
    if (moveX !== 0 || moveZ !== 0) {
        sonic.rotation.y = Math.atan2(moveX, moveZ);
    }
    
    // Spin when jumping
    if (gameState.isJumping) {
        sonic.rotation.x += 0.3;
    } else {
        sonic.rotation.x = 0;
    }
    
    // Update speed display
    gameState.speed = Math.floor(horizontalVelocity.length());
    
    // Update invulnerability
    if (gameState.invulnerable) {
        gameState.invulnerableTime -= deltaTime;
        if (gameState.invulnerableTime <= 0) {
            gameState.invulnerable = false;
            sonic.visible = true;
        } else {
            // Flash effect
            sonic.visible = Math.floor(gameState.invulnerableTime * 10) % 2 === 0;
        }
    }
}

function updateCamera() {
    // Sonic X-Treme style fixed isometric camera with fish-eye
    // Camera stays close to player like X-Treme
    
    // Much closer camera offset - X-Treme style
    let cameraOffset = new THREE.Vector3(0, 8, 10);
    
    // Apply touch camera rotation if active
    if (touchState.camera.currentX !== 0 || touchState.camera.currentY !== 0) {
        const rotationX = touchState.camera.currentX;
        const rotationY = touchState.camera.currentY;
        
        // Rotate camera offset based on touch input
        cameraOffset.x += rotationX * 10;
        cameraOffset.y += rotationY * 5;
    }
    
    // Position camera relative to Sonic
    const desiredCameraPosition = sonic.position.clone().add(cameraOffset);
    
    // Smooth camera movement (follows Sonic)
    camera.position.lerp(desiredCameraPosition, 0.2);
    
    // Always look at Sonic - keep him centered
    camera.lookAt(sonic.position);
    
    // No rotation - keep camera steady like X-Treme
    camera.rotation.z = 0;
}

function updateRings(deltaTime) {
    rings.forEach((ring, index) => {
        // Rotate rings
        ring.rotation.y += deltaTime * 2;
        ring.rotation.x = Math.sin(Date.now() * 0.001 + index) * 0.2;
        
        // Check collection
        const distance = sonic.position.distanceTo(ring.position);
        if (distance < 3) {
            scene.remove(ring);
            rings.splice(rings.indexOf(ring), 1);
            gameState.rings++;
            gameState.score += 10;
        }
    });
}

function updateEnemies(deltaTime) {
    enemies.forEach((enemy) => {
        // Patrol around initial position
        if (enemy.userData.initialPos) {
            enemy.userData.direction += deltaTime * 0.5;
            enemy.position.x = enemy.userData.initialPos.x + Math.cos(enemy.userData.direction) * enemy.userData.patrolRadius;
            enemy.position.z = enemy.userData.initialPos.z + Math.sin(enemy.userData.direction) * enemy.userData.patrolRadius;
        } else {
            // Simple patrol movement
            enemy.position.x += Math.cos(enemy.userData.direction) * enemy.userData.speed;
            enemy.position.z += Math.sin(enemy.userData.direction) * enemy.userData.speed;
            
            // Bounce off boundaries
            if (Math.abs(enemy.position.x) > 90) {
                enemy.userData.direction = Math.PI - enemy.userData.direction;
            }
            if (Math.abs(enemy.position.z) > 90) {
                enemy.userData.direction = -enemy.userData.direction;
            }
        }
        
        // Rotate enemy
        enemy.rotation.y += 0.02;
        
        // Check collision with Sonic
        if (!gameState.invulnerable && !gameState.isDead) {
            const distance = sonic.position.distanceTo(enemy.position);
            if (distance < 4) {
                if (gameState.isJumping && gameState.velocity.y < 0) {
                    // Destroy enemy
                    scene.remove(enemy);
                    enemies.splice(enemies.indexOf(enemy), 1);
                    gameState.score += 100;
                    // Bounce
                    gameState.velocity.y = 10;
                } else {
                    // Take damage
                    if (gameState.rings > 0) {
                        // Lose rings
                        gameState.rings = 0;
                        // Knockback
                        gameState.velocity.y = 10;
                        const knockback = sonic.position.clone().sub(enemy.position).normalize();
                        gameState.velocity.x = knockback.x * 20;
                        gameState.velocity.z = knockback.z * 20;
                        // Become invulnerable
                        gameState.invulnerable = true;
                        gameState.invulnerableTime = 2;
                    } else {
                        // Die if no rings
                        handleDeath();
                    }
                }
            }
        }
    });
}

function handleDeath() {
    if (gameState.isDead) return;
    
    gameState.isDead = true;
    gameState.lives--;
    
    if (gameState.lives <= 0) {
        // Game Over
        setTimeout(() => {
            alert('GAME OVER! Press OK to restart.');
            location.reload();
        }, 1000);
    } else {
        // Respawn
        setTimeout(() => {
            sonic.position.copy(gameState.checkpointPosition);
            gameState.velocity.set(0, 0, 0);
            gameState.isDead = false;
            gameState.rings = 0;
            gameState.invulnerable = true;
            gameState.invulnerableTime = 3;
        }, 2000);
    }
}

function handleLevelComplete() {
    if (gameState.levelComplete) return;
    
    gameState.levelComplete = true;
    gameState.score += 1000 + (gameState.rings * 10);
    
    // Stop main music and play victory music
    stopMusic();
    playVictoryMusic();
    
    // Show completion message
    setTimeout(() => {
        alert(`LEVEL COMPLETE!\nScore: ${gameState.score}\nPress OK to continue.`);
        location.reload();
    }, 3000);
}

function playVictoryMusic() {
    if (!audioContext) return;
    
    // Simple victory fanfare
    const notes = [
        {freq: 523.25, time: 0, duration: 0.2},      // C5
        {freq: 523.25, time: 0.2, duration: 0.2},    // C5
        {freq: 523.25, time: 0.4, duration: 0.2},    // C5
        {freq: 659.25, time: 0.6, duration: 0.4},    // E5
        {freq: 783.99, time: 1.0, duration: 0.2},    // G5
        {freq: 783.99, time: 1.2, duration: 0.2},    // G5
        {freq: 1046.50, time: 1.4, duration: 0.8},   // C6
    ];
    
    const currentTime = audioContext.currentTime;
    
    notes.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.frequency.value = note.freq;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0, currentTime + note.time);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + note.time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.time + note.duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start(currentTime + note.time);
        oscillator.stop(currentTime + note.time + note.duration);
    });
}

function updateUI() {
    document.getElementById('score').textContent = `Score: ${gameState.score}`;
    document.getElementById('rings').textContent = `Rings: ${gameState.rings}`;
    document.getElementById('lives').textContent = `Lives: ${gameState.lives}`;
    document.getElementById('speed').textContent = `Speed: ${gameState.speed}`;
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    updateSonic(deltaTime);
    updateCamera();
    updateRings(deltaTime);
    updateEnemies(deltaTime);
    updateUI();
    
    renderer.render(scene, camera);
}

// Music Generation System
function initMusic() {
    // Try to use Tone.js first, fallback to Web Audio API
    if (window.Tone) {
        console.log('Using Tone.js for music');
        initToneMusic();
    } else {
        console.log('Using Web Audio API for music');
        initWebAudioMusic();
    }
}

function initToneMusic() {
    // Load and play MIDI with Tone.js
    fetch('Atavachron.mid')
        .then(response => response.arrayBuffer())
        .then(data => {
            const midi = new Midi(data);
            console.log('MIDI loaded:', midi.name, 'Tracks:', midi.tracks.length);
            
            const parts = [];
            
            // Process each track
            midi.tracks.forEach((track, trackIndex) => {
                if (track.notes.length === 0) return;
                
                console.log(`Track ${trackIndex}: ${track.name}, Channel: ${track.channel}, Notes: ${track.notes.length}`);
                
                let instrument;
                
                // Check if it's a drum track (usually channel 10 or 9 in 0-indexed)
                if (track.channel === 9) {
                    // Create drum kit with different sounds
                    const drumKit = {
                        // Kick drum (MIDI notes 35-36)
                        kick: new Tone.MembraneSynth({
                            pitchDecay: 0.05,
                            octaves: 10,
                            oscillator: { type: 'sine' },
                            envelope: {
                                attack: 0.001,
                                decay: 0.4,
                                sustain: 0.01,
                                release: 1.4
                            }
                        }).toDestination(),
                        
                        // Snare drum (MIDI notes 38-40) - higher pitched, snappier
                        snare: new Tone.MembraneSynth({
                            pitchDecay: 0.005,  // Very quick pitch drop for snap
                            octaves: 1.5,  // Less octave range for tighter sound
                            oscillator: { type: 'triangle' },  // Brighter tone
                            envelope: {
                                attack: 0.001,
                                decay: 0.08,  // Quicker decay
                                sustain: 0,
                                release: 0.15
                            }
                        }).toDestination(),
                        
                        // Snare rattle/buzz - white noise for brightness
                        snareNoise: new Tone.NoiseSynth({
                            noise: { type: 'white' },  // White noise for brightness
                            envelope: {
                                attack: 0.001,
                                decay: 0.03,  // Very quick for snap
                                sustain: 0.01,
                                release: 0.08
                            }
                        }).toDestination(),
                        
                        // Hi-hat (MIDI notes 42, 44, 46) - crisper hi-hat
                        hihat: new Tone.MetalSynth({
                            frequency: 800,
                            envelope: {
                                attack: 0.001,
                                decay: 0.03,
                                release: 0.01
                            },
                            harmonicity: 5.1,
                            modulationIndex: 32,
                            resonance: 8000,
                            octaves: 1.5
                        }).toDestination(),
                        
                        // Open hi-hat
                        openHihat: new Tone.MetalSynth({
                            frequency: 800,
                            envelope: {
                                attack: 0.002,
                                decay: 0.3,
                                release: 0.2
                            },
                            harmonicity: 5.1,
                            modulationIndex: 32,
                            resonance: 6000,
                            octaves: 1.5
                        }).toDestination(),
                        
                        // Crash Cymbal (MIDI notes 49, 57)
                        cymbal: new Tone.MetalSynth({
                            frequency: 500,
                            envelope: {
                                attack: 0.001,
                                decay: 0.5,
                                sustain: 0.3,
                                release: 2
                            },
                            harmonicity: 5.1,
                            modulationIndex: 64,
                            resonance: 8000,
                            octaves: 2
                        }).toDestination(),
                        
                        // Ride Cymbal (MIDI note 51)
                        ride: new Tone.MetalSynth({
                            frequency: 600,
                            envelope: {
                                attack: 0.002,
                                decay: 0.4,
                                sustain: 0.2,
                                release: 1
                            },
                            harmonicity: 5.1,
                            modulationIndex: 48,
                            resonance: 7000,
                            octaves: 1.8
                        }).toDestination(),
                        
                        // Tom drums - using membrane synth
                        tomHigh: new Tone.MembraneSynth({
                            pitchDecay: 0.02,
                            octaves: 6,
                            oscillator: { type: 'sine' },
                            envelope: {
                                attack: 0.001,
                                decay: 0.3,
                                sustain: 0,
                                release: 0.5
                            }
                        }).toDestination(),
                        
                        tomMid: new Tone.MembraneSynth({
                            pitchDecay: 0.03,
                            octaves: 5,
                            oscillator: { type: 'sine' },
                            envelope: {
                                attack: 0.001,
                                decay: 0.35,
                                sustain: 0,
                                release: 0.6
                            }
                        }).toDestination(),
                        
                        tomLow: new Tone.MembraneSynth({
                            pitchDecay: 0.04,
                            octaves: 4,
                            oscillator: { type: 'sine' },
                            envelope: {
                                attack: 0.001,
                                decay: 0.4,
                                sustain: 0,
                                release: 0.7
                            }
                        }).toDestination()
                    };
                    
                    // Set volumes - emphasize noise for snare character
                    drumKit.kick.volume.value = 2;  // Louder kick drum
                    drumKit.snare.volume.value = -6;  // Lower the tone component
                    drumKit.snareNoise.volume.value = 0;  // Emphasize the noise/rattle for snare sound
                    drumKit.hihat.volume.value = -10;
                    drumKit.openHihat.volume.value = -8;
                    drumKit.cymbal.volume.value = -6;
                    drumKit.ride.volume.value = -8;
                    drumKit.tomHigh.volume.value = 0;  // Louder high tom
                    drumKit.tomMid.volume.value = 1;   // Louder mid tom
                    drumKit.tomLow.volume.value = 2;   // Louder low tom
                    
                    // Simplified effects chain - direct to destination
                    // Create panners for stereo positioning
                    const panners = {
                        kick: new Tone.Panner(0).toDestination(),           // Center
                        snare: new Tone.Panner(0.1).toDestination(),        // Slightly right
                        snareNoise: new Tone.Panner(0.1).toDestination(),   // Match snare
                        hihat: new Tone.Panner(-0.4).toDestination(),       // Left side
                        openHihat: new Tone.Panner(-0.4).toDestination(),   // Left side
                        cymbal: new Tone.Panner(0.6).toDestination(),       // Right side
                        ride: new Tone.Panner(0.5).toDestination(),         // Right-center
                        tomHigh: new Tone.Panner(-0.3).toDestination(),     // Left
                        tomMid: new Tone.Panner(0).toDestination(),         // Center
                        tomLow: new Tone.Panner(0.3).toDestination()        // Right
                    };
                    
                    // Reconnect all drums through panners
                    drumKit.kick.disconnect();
                    drumKit.kick.connect(panners.kick);
                    
                    drumKit.snare.disconnect();
                    drumKit.snare.connect(panners.snare);
                    
                    drumKit.snareNoise.disconnect();
                    drumKit.snareNoise.connect(panners.snareNoise);
                    
                    drumKit.hihat.disconnect();
                    drumKit.hihat.connect(panners.hihat);
                    
                    drumKit.openHihat.disconnect();
                    drumKit.openHihat.connect(panners.openHihat);
                    
                    drumKit.cymbal.disconnect();
                    drumKit.cymbal.connect(panners.cymbal);
                    
                    drumKit.ride.disconnect();
                    drumKit.ride.connect(panners.ride);
                    
                    drumKit.tomHigh.disconnect();
                    drumKit.tomHigh.connect(panners.tomHigh);
                    
                    drumKit.tomMid.disconnect();
                    drumKit.tomMid.connect(panners.tomMid);
                    
                    drumKit.tomLow.disconnect();
                    drumKit.tomLow.connect(panners.tomLow);
                    
                    instrument = drumKit;
                } else {
                    // Create different synths for different tracks
                    const synthTypes = ['sawtooth', 'square', 'triangle', 'sine'];
                    const synthType = synthTypes[trackIndex % synthTypes.length];
                    
                    instrument = new Tone.PolySynth(Tone.Synth, {
                        oscillator: { type: synthType },
                        envelope: {
                            attack: 0.02,
                            decay: 0.1,
                            sustain: 0.3,
                            release: 0.8
                        }
                    }).toDestination();
                    
                    // Adjust volume based on track
                    instrument.volume.value = trackIndex === 0 ? -8 : -12;
                }
                
                midiSynths.push(instrument);
                
                // Create part for this track
                const part = new Tone.Part((time, note) => {
                    if (track.channel === 9) {
                        // Map MIDI note numbers to drum sounds
                        const noteNum = note.midi;
                        
                        if (noteNum === 35 || noteNum === 36) {
                            // Bass drum
                            instrument.kick.triggerAttackRelease('C1', note.duration, time, note.velocity);
                        } else if (noteNum === 38 || noteNum === 40) {
                            // Snare drum - higher pitch for snare crack, not kick thump
                            instrument.snare.triggerAttackRelease('A2', '16n', time, note.velocity);  // Much higher pitch
                            instrument.snareNoise.triggerAttackRelease('8n', time, note.velocity * 1.5);  // More noise emphasis
                        } else if (noteNum === 37) {
                            // Side stick/rim shot
                            instrument.snare.triggerAttackRelease('F2', '16n', time, note.velocity * 0.6);
                        } else if (noteNum === 42) {
                            // Closed hi-hat
                            instrument.hihat.triggerAttackRelease('32n', time, note.velocity * 0.8);
                        } else if (noteNum === 44) {
                            // Pedal hi-hat
                            instrument.hihat.triggerAttackRelease('16n', time, note.velocity * 0.6);
                        } else if (noteNum === 46) {
                            // Open hi-hat
                            instrument.openHihat.triggerAttackRelease(note.duration, time, note.velocity * 0.9);
                        } else if (noteNum === 49) {
                            // Crash cymbal 1
                            instrument.cymbal.triggerAttackRelease(note.duration, time, note.velocity);
                        } else if (noteNum === 57) {
                            // Crash cymbal 2
                            instrument.cymbal.triggerAttackRelease(note.duration, time, note.velocity * 1.1);
                        } else if (noteNum === 51 || noteNum === 59) {
                            // Ride cymbal
                            instrument.ride.triggerAttackRelease(note.duration, time, note.velocity * 0.8);
                        } else if (noteNum === 53) {
                            // Ride bell
                            instrument.ride.triggerAttackRelease('16n', time, note.velocity * 1.2);
                        } else if (noteNum === 41 || noteNum === 43) {
                            // Low floor tom / Low tom
                            instrument.tomLow.triggerAttackRelease('F1', note.duration, time, note.velocity);
                        } else if (noteNum === 45 || noteNum === 47) {
                            // Low-mid tom / Mid tom
                            instrument.tomMid.triggerAttackRelease('A1', note.duration, time, note.velocity);
                        } else if (noteNum === 48 || noteNum === 50) {
                            // High-mid tom / High tom
                            instrument.tomHigh.triggerAttackRelease('C2', note.duration, time, note.velocity);
                        } else if (noteNum === 39) {
                            // Hand clap - use snare with short duration
                            instrument.snareNoise.triggerAttackRelease('32n', time, note.velocity * 0.7);
                        } else if (noteNum >= 60 && noteNum <= 77) {
                            // Various percussion - map to different sounds
                            if (noteNum % 3 === 0) {
                                instrument.hihat.triggerAttackRelease('32n', time, note.velocity * 0.5);
                            } else if (noteNum % 3 === 1) {
                                instrument.snareNoise.triggerAttackRelease('32n', time, note.velocity * 0.4);
                            } else {
                                instrument.ride.triggerAttackRelease('16n', time, note.velocity * 0.4);
                            }
                        } else {
                            // Default fallback - light hi-hat
                            instrument.hihat.triggerAttackRelease('32n', time, note.velocity * 0.3);
                        }
                    } else {
                        instrument.triggerAttackRelease(note.name, note.duration, time, note.velocity);
                    }
                }, []);
                
                // Add all notes from this track
                track.notes.forEach(note => {
                    part.add(note.time, note);
                });
                
                part.loop = true;
                part.loopEnd = midi.duration;
                parts.push(part);
            });
            
            // Store all parts for control
            window.midiParts = parts;
            console.log('MIDI setup complete with', parts.length, 'parts');
        })
        .catch(err => {
            console.log('Could not load MIDI, using procedural music', err);
            initWebAudioMusic();
        });
}

function initWebAudioMusic() {
    // Create audio context
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create a procedural music sequencer
    class MusicSequencer {
        constructor() {
            this.tempo = 132; // BPM - Atavachron prog rock tempo
            this.beatLength = 60 / this.tempo;
            this.currentTime = 0;
            this.isPlaying = false;
            this.measureCount = 0;
            
            // Atavachron-inspired prog rock chord progressions
            // Based on the MIDI analysis - complex harmonies
            this.chordProgressions = [
                ['C3', 'E3', 'G3', 'B3', 'D4'],            // Cmaj9
                ['A2', 'C3', 'E3', 'G3', 'B3'],            // Am11
                ['F3', 'A3', 'C4', 'E4', 'G4'],            // Fmaj9
                ['D3', 'F#3', 'A3', 'C4', 'E4'],           // D7add9
                ['G3', 'B3', 'D4', 'F#4', 'A4'],           // Gmaj9
                ['E3', 'G#3', 'B3', 'D4', 'F#4'],          // E7#9
                ['Bb2', 'D3', 'F3', 'A3', 'C4'],           // Bb6/9
                ['Ab3', 'C4', 'Eb4', 'G4', 'Bb4'],         // Abmaj7
            ];
            
            // Atavachron melody notes - prog rock/fusion scale
            this.melodyNotes = ['C4', 'D4', 'E4', 'F4', 'F#4', 'G4', 'A4', 'Bb4', 'B4',
                               'C5', 'D5', 'E5', 'F5', 'F#5', 'G5', 'A5', 'Bb5', 'B5', 'C6'];
            
            // Progressive bass line pattern
            this.bassNotes = ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'Bb2', 'B2'];
            
            this.noteFrequencies = {
                'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'Eb1': 38.89, 'E1': 41.20, 'F1': 43.65, 'F#1': 46.25, 'G1': 49.00, 'Ab1': 51.91, 'A1': 55.00, 'Bb1': 58.27, 'B1': 61.74,
                'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'Eb2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
                'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'Db3': 138.59, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'Gb3': 185.00, 'G#3': 207.65, 'Ab3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08, 'B3': 246.94,
                'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'Db4': 277.18, 'D#4': 311.13, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'Gb4': 369.99, 'G#4': 415.30, 'Ab4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
                'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77,
                'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'E6': 1318.51
            };
        }
        
        playNote(frequency, startTime, duration, type = 'sine', volume = 0.3) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            
            // ADSR envelope
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, startTime + duration * 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        }
        
        playDrum(type, startTime) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            if (type === 'kick') {
                oscillator.frequency.setValueAtTime(150, startTime);
                oscillator.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.5);
                gainNode.gain.setValueAtTime(1, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
            } else if (type === 'snare') {
                oscillator.type = 'triangle';
                oscillator.frequency.value = 200;
                filter.type = 'highpass';
                filter.frequency.value = 1000;
                gainNode.gain.setValueAtTime(0.5, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            } else if (type === 'hihat') {
                oscillator.type = 'square';
                oscillator.frequency.value = 800;
                filter.type = 'highpass';
                filter.frequency.value = 5000;
                gainNode.gain.setValueAtTime(0.3, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
            }
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.5);
        }
        
        generatePattern() {
            const currentTime = audioContext.currentTime;
            const patternLength = 8; // 8 bars for Atavachron-style progression
            this.measureCount++;
            
            // Atavachron-inspired complex rhythm pattern (prog rock style)
            for (let bar = 0; bar < patternLength; bar++) {
                // Use 7/8 feel over 4/4 for rhythmic tension
                const useOddTime = bar % 2 === 0;
                const beatsInBar = useOddTime ? 7 : 8;
                
                for (let beat = 0; beat < beatsInBar; beat++) {
                    const beatTime = currentTime + (bar * 4 * this.beatLength) + (beat * this.beatLength / 2);
                    
                    // Syncopated kick pattern
                    if (beat === 0 || (beat === 3 && !useOddTime) || beat === 5) {
                        this.playDrum('kick', beatTime);
                    }
                    
                    // Ghost notes and accents on snare
                    if (beat === 2 || beat === 6) {
                        this.playDrum('snare', beatTime);
                    } else if (Math.random() > 0.7) {
                        this.playDrum('snare', beatTime + this.beatLength * 0.125);
                    }
                    
                    // Ride cymbal pattern with accents
                    if (beat % 2 === 0 || Math.random() > 0.5) {
                        const volume = (beat === 0 || beat === 4) ? 0.4 : 0.2;
                        this.playDrum('hihat', beatTime);
                    }
                }
            }
            
            // Angular bass line with wide intervals (DTTH style)
            for (let bar = 0; bar < patternLength; bar++) {
                // Irregular bass rhythm
                const pattern = [0, 0.75, 1.5, 2.25, 3, 3.375, 3.75]; // Syncopated pattern
                
                pattern.forEach((offset, index) => {
                    const beatTime = currentTime + (bar * 4 * this.beatLength) + (offset * this.beatLength);
                    
                    // Jump by large intervals for angular movement
                    const bassIndex = (bar * 3 + index * 5) % this.bassNotes.length;
                    const bassNote = this.bassNotes[bassIndex];
                    const bassFreq = this.noteFrequencies[bassNote];
                    
                    // Punchy bass with quick decay
                    this.playNote(bassFreq, beatTime, this.beatLength * 0.3, 'sawtooth', 0.6);
                    // Add sub bass for weight
                    this.playNote(bassFreq * 0.5, beatTime, this.beatLength * 0.2, 'sine', 0.3);
                });
            }
            
            // Generate extended jazz chords with voicings
            for (let bar = 0; bar < patternLength; bar++) {
                const chord = this.chordProgressions[bar % this.chordProgressions.length];
                const chordTime = currentTime + bar * 4 * this.beatLength;
                
                // Stagger chord notes for jazz voicing
                chord.forEach((note, index) => {
                    const freq = this.noteFrequencies[note];
                    const staggerTime = chordTime + (index * 0.02); // Slight roll
                    const duration = this.beatLength * (2 + Math.random() * 2);
                    // Use electric piano-like sound (sine with slight detune)
                    this.playNote(freq, staggerTime, duration, 'sine', 0.15);
                    this.playNote(freq * 1.01, staggerTime, duration, 'triangle', 0.08); // Detune for richness
                });
            }
            
            // Fast, fluid lead lines (DTTH virtuosic style)
            for (let bar = 0; bar < patternLength; bar++) {
                // Alternate between rapid runs and sustained notes
                const isRapidSection = bar % 3 !== 2;
                
                if (isRapidSection) {
                    // Blazing fast runs - 32nd notes
                    const runLength = 16 + Math.floor(Math.random() * 16);
                    let direction = Math.random() > 0.5 ? 1 : -1;
                    let currentIndex = Math.floor(Math.random() * this.melodyNotes.length);
                    
                    for (let note = 0; note < runLength; note++) {
                        const beatTime = currentTime + (bar * 4 * this.beatLength) + (note * this.beatLength / 8);
                        
                        // Chromatic runs with occasional leaps
                        if (Math.random() > 0.8) {
                            // Large interval jump
                            currentIndex = (currentIndex + direction * (7 + Math.floor(Math.random() * 5))) % this.melodyNotes.length;
                            direction *= -1; // Change direction after jump
                        } else {
                            // Chromatic movement
                            currentIndex = (currentIndex + direction) % this.melodyNotes.length;
                        }
                        
                        if (currentIndex < 0) currentIndex = this.melodyNotes.length - 1;
                        
                        const melodyNote = this.melodyNotes[currentIndex];
                        const freq = this.noteFrequencies[melodyNote];
                        
                        // Sharp attack, quick decay for clarity in fast passages
                        this.playNote(freq, beatTime, this.beatLength * 0.1, 'sawtooth', 0.2);
                        // Subtle harmonics for texture
                        this.playNote(freq * 2.01, beatTime, this.beatLength * 0.05, 'sine', 0.05);
                    }
                } else {
                    // Sustained bent notes with vibrato
                    const sustainedNote = this.melodyNotes[Math.floor(Math.random() * this.melodyNotes.length)];
                    const baseFreq = this.noteFrequencies[sustainedNote];
                    const sustainTime = currentTime + (bar * 4 * this.beatLength);
                    
                    // Long sustained note with pitch bend
                    for (let i = 0; i < 8; i++) {
                        const time = sustainTime + i * this.beatLength * 0.5;
                        const pitchBend = 1 + Math.sin(i * 0.5) * 0.03; // Vibrato
                        this.playNote(baseFreq * pitchBend, time, this.beatLength * 0.6, 'sawtooth', 0.3);
                    }
                }
            }
            
            // Schedule next pattern
            if (this.isPlaying) {
                setTimeout(() => this.generatePattern(), patternLength * 4 * this.beatLength * 1000);
            }
        }
        
        start() {
            if (!this.isPlaying) {
                this.isPlaying = true;
                this.generatePattern();
            }
        }
        
        stop() {
            this.isPlaying = false;
        }
    }
    
    // Create procedural music sequencer
    if (!window.Tone) {
        musicSequencer = new MusicSequencer();
    }
}

// Global music control functions
function startMusic() {
    if (isMusicPlaying) return;
    
    isMusicPlaying = true;
    
    if (window.Tone) {
        Tone.start().then(() => {
            Tone.Transport.start();
            // Start all MIDI parts
            if (window.midiParts && window.midiParts.length > 0) {
                window.midiParts.forEach(part => {
                    part.start(0);
                });
            }
        });
    } else if (musicSequencer) {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        musicSequencer.start();
    }
    
    document.getElementById('music').textContent = '🔊 Music: ON (M to toggle)';
    document.getElementById('music').style.background = 'rgba(0,255,0,0.5)';
}

function stopMusic() {
    if (!isMusicPlaying) return;
    
    isMusicPlaying = false;
    
    if (window.Tone && window.Tone.Transport) {
        Tone.Transport.stop();
        // Stop all MIDI parts
        if (window.midiParts && window.midiParts.length > 0) {
            window.midiParts.forEach(part => {
                part.stop();
            });
        }
    } else if (musicSequencer) {
        musicSequencer.stop();
    }
    
    document.getElementById('music').textContent = '🔇 Music: OFF (M to toggle)';
    document.getElementById('music').style.background = 'rgba(255,0,0,0.5)';
}

function toggleMusic() {
    if (isMusicPlaying) {
        stopMusic();
    } else {
        startMusic();
    }
}

// Add music toggle with M key
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm') {
        toggleMusic();
    }
});

// Start the game when page loads
window.addEventListener('load', init);
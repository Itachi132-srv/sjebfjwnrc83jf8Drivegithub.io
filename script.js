let scene, camera, renderer, car;
let roadSegments = [];
let speed = 0, maxSpeed = 1.2, acceleration = 0.005, deceleration = 0.01;
let distance = 0;
let isGameOver = false;
let targetCarRotationZ = 0;

const keys = { up: false, down: false, left: false, right: false };

init();
animate();

function init() {
    // Scene & Fog (Sunset Desert Vibe)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffb366);
    scene.fog = new THREE.FogExp2(0xffb366, 0.015);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff0e6, 0.9);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Create Desert Ground
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xd2a679, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // Build Initial Road Segments
    for (let i = 0; i < 15; i++) {
        createRoadSegment(-i * 40);
    }

    // Load Car with MTL and OBJ Loaders
    createCar();

    // Controls & Events
    setupControls();
    window.addEventListener('resize', onWindowResize);
}

function createRoadSegment(zPos) {
    const roadGroup = new THREE.Group();
    
    const roadGeo = new THREE.PlaneGeometry(16, 40);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    roadGroup.add(road);

    const lineGeo = new THREE.PlaneGeometry(0.4, 40);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.01;
    roadGroup.add(line);

    const railGeo = new THREE.BoxGeometry(0.5, 1, 40);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 });
    
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-8.2, 0.5, 0);
    leftRail.castShadow = true;
    roadGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(8.2, 0.5, 0);
    rightRail.castShadow = true;
    roadGroup.add(rightRail);

    roadGroup.position.z = zPos;
    scene.add(roadGroup);
    roadSegments.push(roadGroup);
}

function createCar() {
    car = new THREE.Group();
    
    // Pehle MTL file load ho gi, phir uske baad OBJ file load ho gi
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.load('sdxmustang.mtl', function (materials) {
        materials.preload();
        
        const objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load('sdxmustang.obj', function (object) {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            object.scale.set(1, 1, 1); // Agar size adjust karna ho toh yahan change karein
            object.position.set(0, 0, 0);
            car.add(object);
        }, undefined, function (error) {
            console.error('OBJ load karne mein error aya:', error);
        });
    }, undefined, function (error) {
        console.error('MTL load karne mein error aya:', error);
    });

    car.position.set(0, 0, 0);
    scene.add(car);
}

function setupControls() {
    const bindButton = (id, keyName) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('mousedown', () => keys[keyName] = true);
        el.addEventListener('mouseup', () => keys[keyName] = false);
        el.addEventListener('mouseleave', () => keys[keyName] = false);
        el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
        el.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
    };

    bindButton('btn-up', 'up');
    bindButton('btn-down', 'down');
    bindButton('btn-left', 'left');
    bindButton('btn-right', 'right');

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
        if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
        if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    });
}

function animate() {
    if (isGameOver) return;

    requestAnimationFrame(animate);

    if (keys.up) {
        speed = Math.min(speed + acceleration, maxSpeed);
    } else if (keys.down) {
        speed = Math.max(speed - deceleration * 2, 0);
    } else {
        speed = Math.max(speed - deceleration, 0);
    }

    if (keys.left && car.position.x > -7) {
        car.position.x -= 0.15;
        targetCarRotationZ = 0.08;
    } else if (keys.right && car.position.x < 7) {
        car.position.x += 0.15;
        targetCarRotationZ = -0.08;
    } else {
        targetCarRotationZ = 0;
    }

    car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, targetCarRotationZ, 0.15);

    if (speed > 0) {
        distance += Math.round(speed * 10);
        roadSegments.forEach(segment => {
            segment.position.z += speed;
        });

        roadSegments.forEach(segment => {
            if (segment.position.z > 20) {
                const furthestZ = Math.min(...roadSegments.map(s => s.position.z));
                segment.position.z = furthestZ - 40;
            }
        });
    }

    camera.position.x = car.position.x * 0.5;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, car.position.y + 3.5, 0.1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, car.position.z + 7, 0.1);
    camera.lookAt(car.position.x, car.position.y + 1, car.position.z - 2);

    const speedEl = document.getElementById('speed-val');
    const distEl = document.getElementById('dist-val');
    if (speedEl) speedEl.innerText = Math.round(speed * 150);
    if (distEl) distEl.innerText = distance;

    renderer.render(scene, camera);
}

function gameOver() {
    isGameOver = true;
    const finalDistEl = document.getElementById('final-dist');
    const gameOverEl = document.getElementById('game-over');
    if (finalDistEl) finalDistEl.innerText = distance;
    if (gameOverEl) gameOverEl.style.display = 'block';
}

function restartGame() {
    isGameOver = false;
    speed = 0;
    distance = 0;
    car.position.set(0, 0, 0);
    const gameOverEl = document.getElementById('game-over');
    if (gameOverEl) gameOverEl.style.display = 'none';
    animate();
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

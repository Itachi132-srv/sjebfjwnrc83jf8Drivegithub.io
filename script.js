let scene, camera, renderer, car;
let roadSegments = [];
let trafficCars = [];
let trafficTemplates = [];
let speed = 0, maxSpeed = 1.4, acceleration = 0.006, deceleration = 0.012;
let distance = 0;
let isGameOver = false;
let targetCarRotationZ = 0;

const keys = { up: false, down: false, left: false, right: false };

init();
animate();

function init() {
    // Scene & Cinematic Desert Sunset Fog
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xff9944);
    scene.fog = new THREE.FogExp2(0xff9944, 0.01);

    // Camera
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Renderer setup with shadows & metallic tone mapping
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    document.body.appendChild(renderer.domElement);

    // Lighting (Bright Sun for Metallic Reflections)
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaee, 1.6);
    sunLight.position.set(80, 150, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 400;
    const d = 40;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Desert Ground
    const groundGeo = new THREE.PlaneGeometry(4000, 4000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xc28d51, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // Build Initial Double Road Segments
    for (let i = 0; i < 20; i++) {
        createRoadSegment(-i * 40);
    }

    // Load Player Car & Traffic Cars
    createPlayerCar();
    loadTrafficTemplates();

    // Controls Setup
    setupControls();
    window.addEventListener('resize', onWindowResize);
}

// Procedural asphalt texture for the road
function createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 30000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = Math.floor(Math.random() * 50) + 20;
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 10);
    return texture;
}

function createRoadSegment(zPos) {
    const roadGroup = new THREE.Group();
    
    // Double Road (Wider width = 30)
    const roadGeo = new THREE.PlaneGeometry(30, 40);
    const roadMat = new THREE.MeshStandardMaterial({ 
        map: createAsphaltTexture(), 
        roughness: 0.6,
        metalness: 0.15 
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    roadGroup.add(road);

    // Center Divider Island / Barrier
    const dividerGeo = new THREE.BoxGeometry(1.2, 0.5, 40);
    const dividerMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.5 });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.set(0, 0.25, 0);
    divider.castShadow = true;
    divider.receiveShadow = true;
    roadGroup.add(divider);

    // Lane Markings
    for (let j = -18; j < 20; j += 6) {
        const lineGeo = new THREE.PlaneGeometry(0.3, 3);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        const line1 = new THREE.Mesh(lineGeo, lineMat);
        line1.rotation.x = -Math.PI / 2;
        line1.position.set(-7.5, 0.02, j);
        roadGroup.add(line1);

        const line2 = new THREE.Mesh(lineGeo, lineMat);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(7.5, 0.02, j);
        roadGroup.add(line2);
    }

    // Outer Side Railings
    const railGeo = new THREE.BoxGeometry(0.4, 0.8, 40);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });
    
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-15.2, 0.4, 0);
    leftRail.castShadow = true;
    roadGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(15.2, 0.4, 0);
    rightRail.castShadow = true;
    roadGroup.add(rightRail);

    roadGroup.position.z = zPos;
    scene.add(roadGroup);
    roadSegments.push(roadGroup);
}

function createPlayerCar() {
    car = new THREE.Group();
    
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.load('sdxcar.mtl', function (materials) {
        materials.preload();
        
        // Metallic & glossy finish for player car
        for (let matName in materials.materials) {
            let mat = materials.materials[matName];
            mat.metalness = 0.7;
            mat.roughness = 0.2;
        }

        const objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load('sdxcar.obj', function (object) {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            object.scale.set(1.2, 1.2, 1.2);
            object.position.set(0, 0, 0);
            car.add(object);
        }, undefined, function (error) {
            console.error('Error loading sdxcar.obj:', error);
        });
    }, undefined, function (error) {
        console.error('Error loading sdxcar.mtl:', error);
    });

    car.position.set(0, 0, 0);
    scene.add(car);
}

function loadTrafficTemplates() {
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.load('Low_Poly_City_Cars.mtl', function (materials) {
        materials.preload();

        for (let matName in materials.materials) {
            let mat = materials.materials[matName];
            mat.metalness = 0.5;
            mat.roughness = 0.3;
        }

        const objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load('Low_Poly_City_Cars.obj', function (object) {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    trafficTemplates.push(child.clone());
                }
            });

            spawnInitialTraffic();
        }, undefined, function (error) {
            console.error('Error loading traffic cars:', error);
        });
    }, undefined, function (error) {
        console.error('Error loading traffic materials:', error);
    });
}

function spawnInitialTraffic() {
    if (trafficTemplates.length === 0) return;
    for (let i = 0; i < 8; i++) {
        spawnTrafficCar(-120 - i * 50);
    }
}

function spawnTrafficCar(zPos) {
    if (trafficTemplates.length === 0) return;

    const template = trafficTemplates[Math.floor(Math.random() * trafficTemplates.length)];
    const trafficMesh = template.clone();

    // Available lanes on double road
    const lanes = [-11, -4, 4, 11];
    const laneX = lanes[Math.floor(Math.random() * lanes.length)];

    trafficMesh.scale.set(1.2, 1.2, 1.2);
    trafficMesh.position.set(laneX, 0, zPos);
    
    trafficMesh.userData = { 
        speed: 0.4 + Math.random() * 0.4 
    };

    scene.add(trafficMesh);
    trafficCars.push(trafficMesh);
}

function setupControls() {
    const bindButton = (id, keyName) => {
        const el = document.getElementById(id);
        if (!el) return;
        
        const pressOn = (e) => { e.preventDefault(); keys[keyName] = true; el.classList.add('active'); };
        const pressOff = (e) => { e.preventDefault(); keys[keyName] = false; el.classList.remove('active'); };

        el.addEventListener('mousedown', pressOn);
        el.addEventListener('mouseup', pressOff);
        el.addEventListener('mouseleave', pressOff);
        el.addEventListener('touchstart', pressOn, { passive: false });
        el.addEventListener('touchend', pressOff, { passive: false });
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

    // Wider steering boundaries for double road (-13 to 13)
    if (keys.left && car.position.x > -13) {
        car.position.x -= 0.18;
        targetCarRotationZ = 0.1;
    } else if (keys.right && car.position.x < 13) {
        car.position.x += 0.18;
        targetCarRotationZ = -0.1;
    } else {
        targetCarRotationZ = 0;
    }

    car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, targetCarRotationZ, 0.15);

    // Infinite road movement & recycling
    if (speed > 0) {
        distance += Math.round(speed * 12);
        roadSegments.forEach(segment => {
            segment.position.z += speed;
        });

        roadSegments.forEach(segment => {
            if (segment.position.z > 20) {
                const furthestZ = Math.min(...roadSegments.map(s => s.position.z));
                segment.position.z = furthestZ - 40;
            }
        });

        // Traffic forward movement & recycling
        trafficCars.forEach(tc => {
            tc.position.z += (speed + tc.userData.speed);
        });

        trafficCars.forEach(tc => {
            if (tc.position.z > 20) {
                const furthestZ = Math.min(...trafficCars.map(t => t.position.z));
                tc.position.z = furthestZ - (60 + Math.random() * 40);
                
                const lanes = [-11, -4, 4, 11];
                tc.position.x = lanes[Math.floor(Math.random() * lanes.length)];
            }
        });

        // Collision Detection with Traffic Cars
        trafficCars.forEach(tc => {
            const dx = Math.abs(car.position.x - tc.position.x);
            const dz = Math.abs(car.position.z - tc.position.z);
            if (dx < 1.8 && dz < 3.2) {
                gameOver();
            }
        });
    }

    const targetFov = 65 + (speed * 8);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
    camera.updateProjectionMatrix();

    camera.position.x = car.position.x * 0.4;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, car.position.y + 3.2, 0.1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, car.position.z + 6.5, 0.1);
    camera.lookAt(car.position.x, car.position.y + 0.8, car.position.z - 2.5);

    const speedEl = document.getElementById('speed-val');
    const distEl = document.getElementById('dist-val');
    if (speedEl) speedEl.innerText = Math.round(speed * 140);
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

    let zReset = -100;
    trafficCars.forEach(tc => {
        zReset -= 50;
        tc.position.z = zReset;
        const lanes = [-11, -4, 4, 11];
        tc.position.x = lanes[Math.floor(Math.random() * lanes.length)];
    });

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

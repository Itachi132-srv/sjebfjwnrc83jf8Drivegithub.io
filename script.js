function createCar() {
    car = new THREE.Group();
    
    const loader = new THREE.OBJLoader();
    loader.load('sdxmustang.obj', function (object) {
        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // Car ka material aur color
                child.material = new THREE.MeshStandardMaterial({ 
                    color: 0xff3838, 
                    roughness: 0.2, 
                    metalness: 0.8 
                });
            }
        });

        // ⚠️ TIP: Agar car game mein bohot bari ya choti aaye, toh yahan scale change kar sakte hain (jaise 0.5 ya 2)
        object.scale.set(1, 1, 1); 
        object.position.set(0, 0, 0);
        car.add(object);
    }, undefined, function (error) {
        console.error('Car load karne mein error aya:', error);
    });

    car.position.set(0, 0, 0);
    scene.add(car);
}

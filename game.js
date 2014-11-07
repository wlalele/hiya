var socket = io.connect('http://' + HIYA.Configuration.HOST + ':' + HIYA.Configuration.PORT);
var clock = new THREE.Clock();

var player_model_group,
    current_player = {},
    players_list = [];

var camera, scene, renderer, stats,
    camera_controls,
    sunlight,
    skybox,
    cubemap;

var objects = [];

var sphere,
    debug_point_light,
    debug_spot_light;

var character,
    player = new THREE.Object3D(),
    rays = [
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 0, 1),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(1, 0, -1),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(-1, 0, -1),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(-1, 0, 1)
    ],
    caster = new THREE.Raycaster();

var blocker = document.getElementById('blocker'),
    instructions = document.getElementById('instructions');

socket.on('connection', function (datas) {
    'use strict';
	current_player = datas;
});

socket.on('playersUpdate', function (serverplayers_list) {
    'use strict';
	var players_to_delete = [], player_index, i, j, player_found = false, config, temp_character;
	for (player_index = 0; player_index < players_list.length; player_index += 1) {
		players_to_delete.push(players_list[player_index].id);
	}
			
	for (i = 0; i < serverplayers_list.length; i += 1) {
		if (serverplayers_list[i].id !== current_player.id) {
			for (j = 0; j < players_to_delete.length; j += 1) {
				if (players_to_delete[j] === serverplayers_list[i].id) {
					players_to_delete.splice(j, 1);
				}
			}

			for (player_index = 0; player_index < players_list.length; player_index += 1) {
				if (players_list[player_index].id === serverplayers_list[i].id) {
					player_found = true;
					players_list[player_index].position = serverplayers_list[i].position;
					players_list[player_index].rotation = serverplayers_list[i].rotation;
					
					if (!players_list[player_index].model) {
						players_list[player_index].model = new THREE.Object3D();
						scene.add(players_list[player_index].model);

						config = {
							baseUrl: 'assets/models/animated/others/',
							body: 'blade.js',
							skins: [ 'blade.jpg' ],
							weapons:  [],
							animations: {
								move: 'run',
								idle: 'stand',
								jump: 'jump'
							},
							walkSpeed: 350,
							crouchSpeed: 175
						};

						temp_character = new THREE.MD2CharacterComplex();
						temp_character.scale = 0.20;
						temp_character.setSkin(0);
						temp_character.root.position.set(0, 5, 0);
						
						players_list[player_index].model.add(temp_character.root);
						temp_character.loadParts(config);
					}
				
					break;
				}
			}
			
			if (!player_found) {
				players_list[players_list.length] = serverplayers_list[i];
			}
		}
	}
		
	for (j = 0; j < players_to_delete.length; j += 1) {
		for (player_index = 0; player_index < players_list.length; player_index += 1) {
			if (players_to_delete[j] === players_list[player_index].id) {
				scene.remove(players_list[player_index].model);
				players_list.splice(player_index, 1);
				break;
			}
		}
	}
	
});

setInterval(function () {
    'use strict';
	socket.emit('update', current_player);
}, 50);

var makeSkybox = function (path, size, debug) {
    'use strict';
    var urls = [
            path + 'right.jpg',
            path + 'left.jpg',
            path + 'top.jpg',
            path + 'bottom.jpg',
            path + 'front.jpg',
            path + 'back.jpg'
        ],
        shader,
        skybox_material;

    cubemap = THREE.ImageUtils.loadTextureCube(urls, new THREE.CubeRefractionMapping());
    cubemap.format = THREE.RGBFormat;

    shader = THREE.ShaderLib.cube;
    shader.uniforms.tCube.value = cubemap;

    skybox_material = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });

    // Debug mode
    debug = typeof debug !== 'undefined' ? debug : false;
    if (debug === true) {
        skybox_material.wireframe = true;
    }

    skybox = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), skybox_material);
    scene.add(skybox);
};

var makeDirectionalLight = function (position, target, color, debug) {
    'use strict';
    // Directional Light
    var directional_light = new THREE.DirectionalLight(color);
    directional_light.position = position;
    directional_light.target.position = target;
    directional_light.castShadow = true;
    directional_light.shadowDarkness = 0.5;
    directional_light.shadowMapWidth = directional_light.shadowMapHeight = 2048;
    directional_light.shadowCameraNear = 325;
    directional_light.shadowCameraFar = 480;
    directional_light.shadowCameraLeft = -80;
    directional_light.shadowCameraRight = 80;
    directional_light.shadowCameraTop = 60;
    directional_light.shadowCameraBottom = -35;
    scene.add(directional_light);
    sunlight = directional_light;

    // Debug mode
    debug = typeof debug !== 'undefined' ? debug : false;
    if (debug === true) {
        directional_light.shadowCameraVisible = true;
    }
};

var makeLight = function (x, y, z, color, intensity, distance, debug) {
    'use strict';
    var light, spot_light;
    
    // Point Light
    light = new THREE.PointLight(color, intensity, distance);
    light.position.set(x, z, y);
    scene.add(light);

    // Spot Light
    spot_light = new THREE.SpotLight(color);
    spot_light.position.set(x, z, y);
    spot_light.target.position.set(x, 0, y);
    spot_light.castShadow = true;
    spot_light.intensity = intensity;
    spot_light.shadowMapWidth = spot_light.shadowMapHeight = 1024;
    spot_light.shadowCameraNear = 1;
    spot_light.shadowCameraFar = z;
    spot_light.shadowCameraFov = 40;
    scene.add(spot_light);

    // Debug mode
    debug = typeof debug !== 'undefined' ? debug : false;
    if (debug === true) {
        scene.add(new THREE.PointLightHelper(light, 1));
        spot_light.shadowCameraVisible = true;
        debug_point_light = light;
        debug_spot_light = spot_light;
    }
};

var createFloor = function () {
    'use strict';
    var geometry, texture, material, mesh;
    geometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

    texture = THREE.ImageUtils.loadTexture('assets/models/flat/tex/wooden_floor.jpg');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);

    material = new THREE.MeshPhongMaterial({
        shininess: 2,
        specular: 0x111111,
        shading: THREE.SmoothShading,
        map: texture,
        wireframe: false
    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.flipSided = false;
    mesh.position.set(0, 0, 0);
    scene.add(mesh);
    objects.push(mesh);
};

var createCeiling = function () {
    'use strict';
    var geometry, material, mesh;
    
    geometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

    material = new THREE.MeshPhongMaterial({
        specular: 0xFFFFFF,
        shading: THREE.SmoothShading,
        side: THREE.DoubleSide,
        wireframe: false
    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.flipSided = false;
    mesh.position.set(0, 18.5, 0);
    scene.add(mesh);
    objects.push(mesh);
};

var createWindow = function () {
    'use strict';
    var geometry, material, mesh;
    
    geometry = new THREE.PlaneGeometry(100, 20, 1, 1);
    
    material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        envMap: cubemap,
        refractionRatio: 0.985,
        transparent: true,
        opacity: 0.050
    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.flipSided = false;
    mesh.position.set(49.5, 10, 0);
    mesh.rotation.y = -Math.PI * 90 / 180;
    scene.add(mesh);
    objects.push(mesh);
};

var makeCharacter = function () {
    'use strict';
    var config = {
        baseUrl: 'assets/models/animated/others/',
        body: 'blade.js',
        skins: [ 'blade.jpg' ],
        weapons:  [],
        animations: {
            move: 'run',
            idle: 'stand',
            jump: 'jump'
        },
        walkSpeed: 350,
        crouchSpeed: 175
    };

    character = new THREE.MD2CharacterComplex();
    character.controls = camera_controls;
    character.scale = 0.20;

    character.onLoadComplete = function () {
        character.setSkin(0);
        character.root.position.set(0, 5, 0);
        scene.add(character.root);
    };

    character.loadParts(config);
    
    player_model_group.add(character);
};

var testBall = function () {
    'use strict';
    var reflection_material = new THREE.MeshBasicMaterial({
        color: 0xCCCCCC,
        envMap: cubemap
    });

    sphere = new THREE.Mesh(
        new THREE.SphereGeometry(2, 32, 32),
        reflection_material
    );

    sphere.position.set(25, 5, 0);
    scene.add(sphere);

    sphere.toggleLight = function (intensity) {
        if (debug_spot_light.intensity === 0 || debug_point_light.intensity === 0) {
            debug_spot_light.intensity = debug_point_light.intensity = intensity;
        } else {
            debug_spot_light.intensity = debug_point_light.intensity = 0;
        }
    };
};

var addJsonOBJ = function (path, x, y, z, scale, angle) {
    'use strict';
    var loader = new THREE.JSONLoader(),
        mesh;
    loader.load(path, function (geometry, materials) {
        mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(materials));
        mesh.position.set(x, y, z);
        mesh.rotation.y = -Math.PI * angle / 180;
        mesh.scale.set(scale, scale, scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.flipSided = true;
        scene.add(mesh);
        objects.push(mesh);
    });
};

var interactionObject = function () {
    'use strict';
	var raycaster = new THREE.Raycaster(),
        intersects,
        intersect,
        object;
	raycaster.set(camera_controls.getObject().position, camera_controls.getDirection(new THREE.Vector3(0, 0, 0)));

	intersects = raycaster.intersectObject(sphere);

	if (intersects.length > 0) {
		intersect = intersects[0];
		object = intersect.object;
		object.toggleLight(HIYA.Configuration.LIGHT_INTENSITY);
	}
};

var onWindowResize = function () {
    'use strict';
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
};

var onWindowClick = function (event) {
    'use strict';
	interactionObject();
};

var onMouseWheel = function (event) {
    'use strict';
	var delta = 0;

	if (event.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
		delta = event.wheelDelta;
	} else if (event.detail !== undefined) { // Firefox
		delta = -event.detail;
	}

	if (delta > 0) {
		if (camera.position.z > HIYA.Configuration.CAMERA_DISTANCE_MIN) {
			camera.position.z -= 1;
		}
	} else {
		if (camera.position.z < HIYA.Configuration.CAMERA_DISTANCE_MAX) {
			camera.position.z += 1;
		}
	}
};

var init = function () {
    'use strict';
	// camera
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
	camera.position.z = 10;

	// scene
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog(0xffffff, 0);

	// players
	player_model_group = new THREE.Object3D();
	scene.add(player_model_group);

	// skybox
	makeSkybox('assets/textures/skybox/', 1500);

	// directional light
	makeDirectionalLight(new THREE.Vector3(300, 180, 200), new THREE.Vector3(0, 0, 0), 0xFFFFFF);
	
	// lights
	makeLight(30, 0, 18, 0x999999, HIYA.Configuration.LIGHT_INTENSITY, 80, true);
	//makeLight(30, 30, 18, 0x999999, HIYA.Configuration.LIGHT_INTENSITY, 80);
	//makeLight(30, -30, 18, 0x999999, HIYA.Configuration.LIGHT_INTENSITY, 80);
	//makeLight(0, 0, 18, 0x999999, HIYA.Configuration.LIGHT_INTENSITY, 80);
	//makeLight(-30, 0, 18, 0x999999, HIYA.Configuration.LIGHT_INTENSITY, 80);
	makeLight(-30, -30, 18, 0x999999, HIYA.Configuration.LIGHT_INTENSITY, 80);
	makeLight(-30, -30, 18, 0x999999, HIYA.Configuration.LIGHT_INTENSITY, 80);
	makeLight(-30, 30, 18, 0x999999, HIYA.Configuration.LIGHT_INTENSITY, 80);

	// controls
	camera_controls = new THREE.PointerLockControls(camera);
	scene.add(camera_controls.getObject());

	// floor
	createFloor();

	// ceiling
	createCeiling();

	// window
	createWindow();

	// objects
	addJsonOBJ('assets/models/flat/flat_walls.js', 0, 0, 0, 10, 0);
	testBall();
	makeCharacter();

	// stats
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	document.body.appendChild(stats.domElement);

	// renderer
	renderer = new THREE.WebGLRenderer({ antialias: true });
	/*renderer.shadowMapEnabled = true;
	renderer.shadowMapSoft = true;
	renderer.shadowCameraNear = 3;
	renderer.shadowCameraFar = camera.far;
	renderer.shadowCameraFov = 50;
	renderer.shadowMapBias = 0.0039;
	renderer.shadowMapDarkness = 0.5;
	renderer.shadowMapWidth = renderer.shadowMapHeight = 1024;*/
	renderer.setClearColor(0xffffff);
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);
	window.addEventListener('resize', onWindowResize, false);
	window.addEventListener('click', onWindowClick, false);
	if (window.addEventListener) {
		// IE9, Chrome, Safari, Opera
		window.addEventListener('mousewheel', onMouseWheel, false);
		// Firefox
		window.addEventListener('DOMMouseScroll', onMouseWheel, false);
	} else {
	    // IE 6/7/8
        window.attachEvent('onmousewheel', onMouseWheel);
    }
};

var lockDirections = function () {
    'use strict';
	if (camera_controls.moveForward()) {
		camera_controls.lockMoveForward(true);
	} else if (camera_controls.moveBackward()) {
		camera_controls.lockMoveBackward(true);
	} else if (camera_controls.moveLeft()) {
		camera_controls.lockMoveLeft(true);
	} else if (camera_controls.moveRight()) {
		camera_controls.lockMoveRight(true);
	}
};

var unlockDirections = function () {
    'use strict';
	camera_controls.lockMoveForward(false);
	camera_controls.lockMoveBackward(false);
	camera_controls.lockMoveLeft(false);
	camera_controls.lockMoveRight(false);
};

var detectCollision = function () {
    'use strict';
	unlockDirections();
	
	var rotationMatrix,
        cameraDirection = camera_controls.getDirection(new THREE.Vector3(0, 0, 0)).clone(),
        collisions,
        i;
	
    if (camera_controls.moveBackward()) {
		rotationMatrix = new THREE.Matrix4();
		rotationMatrix.makeRotationY(180 * Math.PI / 180);
	} else if (camera_controls.moveLeft()) {
		rotationMatrix = new THREE.Matrix4();
		rotationMatrix.makeRotationY(90 * Math.PI / 180);
	} else if (camera_controls.moveRight()) {
		rotationMatrix = new THREE.Matrix4();
		rotationMatrix.makeRotationY((360 - 90) * Math.PI / 180);
	} else {
        return;
    }
	
	if (rotationMatrix !== undefined) {
		cameraDirection.applyMatrix4(rotationMatrix);
	}

	for (i = 0; i < rays.length; i += 1) {
		// We reset the raycaster to this direction
        caster.set(camera_controls.getObject().position, cameraDirection);
        // Test if we intersect with any obstacle mesh
        collisions = caster.intersectObjects(objects);

		if (collisions.length > 0 && collisions[0].distance <= HIYA.Configuration.DISTANCE) {
			lockDirections();
			console.log('Collision detected @ ' + collisions[0].distance);
		}
	}
};

var animate = function () {
    'use strict';
    var delta, player_index;
    
	detectCollision();

	delta = clock.getDelta();
	camera_controls.update(delta);

	if (character.root !== null) {
		character.update(delta);
	}

	if (camera.position.z === 0) {
		character.setVisible(false);
	} else {
		character.setVisible(true);
	}

	for (player_index = 0; player_index < players_list.length; player_index += 1) {
		if (players_list[player_index].id !== current_player.id && players_list[player_index].model) {
			players_list[player_index].model.position.x = players_list[player_index].position.x;
			players_list[player_index].model.position.z = players_list[player_index].position.z;
            players_list[player_index].model.rotation.y = players_list[player_index].rotation._y;
		}
	}
				
	player_model_group.position.x = character.root.position.x;
	player_model_group.position.z = character.root.position.z;
	player_model_group.rotation.y = character.root.rotation.y;
	
	current_player.position = player_model_group.position;
	current_player.rotation = player_model_group.rotation;

	stats.update();
	renderer.render(scene, camera);

	// Falling Motion
	/*if (camera_controls.getObject().position.x > 50) {
		camera_controls.getObject().position.y -=  1 + Math.abs(camera_controls.getObject().position.y / 10);
		camera_controls.enabled = false;
		if (camera_controls.getObject().position.y < -1500) {
			renderer.setClearColor(0xff0000, 1);
			camera_controls.getObject().position.x = 0;
			camera_controls.getObject().position.y = 0;
			camera_controls.enabled = true;
		}
	}*/

	requestAnimationFrame(animate);
};

var pointerLockInit = function () {
    'use strict';
	var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document,
        element = document.body,
        pointerlockchange,
        pointerlockerror,
        fullscreenchange;
	if (havePointerLock) {
		pointerlockchange = function (event) {
			if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element) {
				camera_controls.enabled = true;
				blocker.style.display = 'none';
			} else {
				camera_controls.enabled = false;
				blocker.style.display = '-webkit-box';
				blocker.style.display = '-moz-box';
				blocker.style.display = 'box';
				instructions.style.display = '';
			}
		};
		pointerlockerror = function (event) {
			instructions.style.display = '';
		};
		// Hook pointer lock state change events
		document.addEventListener('pointerlockchange', pointerlockchange, false);
		document.addEventListener('mozpointerlockchange', pointerlockchange, false);
		document.addEventListener('webkitpointerlockchange', pointerlockchange, false);
		document.addEventListener('pointerlockerror', pointerlockerror, false);
		document.addEventListener('mozpointerlockerror', pointerlockerror, false);
		document.addEventListener('webkitpointerlockerror', pointerlockerror, false);
		instructions.addEventListener('click', function (event) {
			instructions.style.display = 'none';
			// Ask the browser to lock the pointer
			element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
			if (/Firefox/i.test(navigator.userAgent)) {
				fullscreenchange = function (event) {
					if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {
						document.removeEventListener('fullscreenchange', fullscreenchange);
						document.removeEventListener('mozfullscreenchange', fullscreenchange);
						element.requestPointerLock();
					}
				};
				document.addEventListener('fullscreenchange', fullscreenchange, false);
				document.addEventListener('mozfullscreenchange', fullscreenchange, false);
				element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
				element.requestFullscreen();
			} else {
				element.requestPointerLock();
			}
		}, false);
	} else {
		instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
	}
};

pointerLockInit();
init();
animate();
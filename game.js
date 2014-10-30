var HOST = 'localhost';
var CAMERA_DISTANCE_MAX = 13;
var CAMERA_DISTANCE_MIN = 0;
var DISTANCE = 10;
var LIGHT_INTENSITY = 2.5;

var socket = io.connect('http://' + HOST + ':8080');

var clock = new THREE.Clock();

var player_model_group;
var current_player = new Object();
var players_list = Array();

var camera, scene, renderer, stats;
var camera_controls;
var sunlight;
var time;
var skybox;
var cubemap;

var objects = [];

var sphere;
var debug_point_light;
var debug_spot_light;

var character;

var player = new THREE.Object3D();
var rays = [
    new THREE.Vector3( 0, 0, 1 ),
    new THREE.Vector3( 1, 0, 1 ),
    new THREE.Vector3( 1, 0, 0 ),
    new THREE.Vector3( 1, 0, -1 ),
    new THREE.Vector3( 0, 0, -1 ),
    new THREE.Vector3( -1, 0, -1 ),
    new THREE.Vector3( -1, 0, 0 ),
    new THREE.Vector3( -1, 0, 1 )
];
var caster = new THREE.Raycaster();

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );

pointerLockInit();
init();
animate();

socket.on( 'connection', function( datas ) {
	current_player = datas;
});

socket.on( 'playersUpdate', function( serverplayers_list ) {

	var players_to_delete = Array();
	for ( var player_index = 0; player_index < players_list.length; player_index++ ) {
		players_to_delete.push( players_list[player_index].id );
	}
			
	for ( var i = 0; i < serverplayers_list.length; i++ ) {
		if ( serverplayers_list[i].id != current_player.id ) {
			for ( var j = 0; j < players_to_delete.length; j++ ) {
				if( players_to_delete[j] == serverplayers_list[i].id ) {
					players_to_delete.splice( j, 1 );
				}
			}
		
			var playerFound = false;
			for ( var player_index = 0; player_index < players_list.length; player_index++ ) {
				if ( players_list[player_index].id == serverplayers_list[i].id ) {
					playerFound = true;
					players_list[player_index].position = serverplayers_list[i].position;
					players_list[player_index].rotation = serverplayers_list[i].rotation;
					
					if ( !players_list[player_index].model ) {
						players_list[player_index].model = new THREE.Object3D();
						scene.add( players_list[player_index].model );

						var config = {
							baseUrl: 'assets/models/animated/ratamahatta/',
							body: 'ratamahatta.js',
							skins: [ 'ratamahatta.png' ],
							weapons:  [  	],
							animations: {
								move: 'run',
								idle: 'stand',
								jump: 'jump'
							},
							walkSpeed: 350,
							crouchSpeed: 175
						};

						var temp_character = new THREE.MD2CharacterComplex();
						temp_character.scale = 0.22;
						temp_character.setSkin( 0 );					
						temp_character.root.position.set( 0, 5, 0 );
						
						if ( temp_character.meshBody != null ) {
							temp_character.meshBody.rotation.y = Math.PI * 90 / 180;
						}

						players_list[player_index].model.add( temp_character.root );
						temp_character.loadParts( config );
					}
				
					break;
				}
			}
			
			if ( !playerFound ) {
				players_list[players_list.length] = serverplayers_list[i];
			}
		}
	}
		
	for ( var j = 0; j < players_to_delete.length; j++ ) {
		for ( var player_index = 0; player_index < players_list.length; player_index++ ) {
			if ( players_to_delete[j] == players_list[player_index].id ) { 
				scene.remove( players_list[player_index].model );				
				players_list.splice( player_index, 1 );
				break;
			}
		}
	}	
	
});

setInterval( function() {
	socket.emit( 'update', current_player );
}, 50);


function init() {

	// camera
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 3000 );
	camera.position.z = 10;

	// scene
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0xffffff, 0 );

	// players
	player_model_group = new THREE.Object3D();
	scene.add( player_model_group );

	// skybox
	makeSkybox( 'assets/textures/skybox/', 1500 );

	function makeSkybox( path, size, debug )
	{
		var urls = [
		  path + 'right.jpg',
		  path + 'left.jpg',
		  path + 'top.jpg',
		  path + 'bottom.jpg',
		  path + 'front.jpg',
		  path + 'back.jpg',
		];

		cubemap = THREE.ImageUtils.loadTextureCube(urls, new THREE.CubeRefractionMapping() );
		cubemap.format = THREE.RGBFormat;

		var shader = THREE.ShaderLib['cube'];
		shader.uniforms['tCube'].value = cubemap;

		var skybox_material = new THREE.ShaderMaterial({
		  fragmentShader: shader.fragmentShader,
		  vertexShader: shader.vertexShader,
		  uniforms: shader.uniforms,
		  depthWrite: false,
		  side: THREE.BackSide
		});

		// Debug mode
		debug = typeof debug !== 'undefined' ? debug : false;
		if ( debug === true ) {
			skybox_material.wireframe = true;	
		}
							
		skybox = new THREE.Mesh( new THREE.BoxGeometry( size, size, size ), skybox_material );
		scene.add(skybox);	
	}
	
	// directional light
	//makeDirectionalLight( new THREE.Vector3( 300, 180, 200 ), new THREE.Vector3( 0, 0, 0 ), 0xFFFFFF );
	
	function makeDirectionalLight( position, target, color, debug ) 
	{
		// Directional Light
		var directional_light = new THREE.DirectionalLight( color );
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
		scene.add( directional_light );
		sunlight = directional_light;

		// Debug mode
		debug = typeof debug !== 'undefined' ? debug : false;
		if ( debug === true ) {
			directional_light.shadowCameraVisible = true;
		}
	}

	// lights
	makeLight( 30, 0, 18, 0x999999, LIGHT_INTENSITY, 80, true);
	//makeLight( 30, 30, 18, 0x999999, LIGHT_INTENSITY, 80);
	//makeLight( 30, -30, 18, 0x999999, LIGHT_INTENSITY, 80);
	//makeLight( 0, 0, 18, 0x999999, LIGHT_INTENSITY, 80);
	//makeLight( -30, 0, 18, 0x999999, LIGHT_INTENSITY, 80);
	makeLight( -30, -30, 18, 0x999999, LIGHT_INTENSITY, 80);
	makeLight( -30, 30, 18, 0x999999, LIGHT_INTENSITY, 80);

	function makeLight( x, y, z, color, intensity, distance, debug )
	{
		// Point Light
		var light = new THREE.PointLight( color, intensity, distance );
		light.position.set( x, z, y );
		scene.add( light );

		// Spot Light
		var spot_light = new THREE.SpotLight( color );
		spot_light.position.set( x, z, y );
		spot_light.target.position.set( x, 0, y );
		spot_light.castShadow = true;
		spot_light.intensity = intensity;
		spot_light.shadowMapWidth = spot_light.shadowMapHeight = 1024;
		spot_light.shadowCameraNear = 1;
		spot_light.shadowCameraFar = z;
		spot_light.shadowCameraFov = 40;
		scene.add( spot_light );

		// Debug mode
		debug = typeof debug !== 'undefined' ? debug : false;
		if ( debug === true ) {
			scene.add( new THREE.PointLightHelper( light, 1 ) );
			spot_light.shadowCameraVisible = true;
			debug_point_light = light;
			debug_spot_light = spot_light;
		}
	}

	// controls
	camera_controls = new THREE.PointerLockControls( camera );
	scene.add( camera_controls.getObject() );

	// floor
	createFloor();

	function createFloor()
	{
		var geometry = new THREE.PlaneGeometry( 100, 100, 1, 1 );
		geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

		var texture = THREE.ImageUtils.loadTexture( 'assets/models/flat/tex/wooden_floor.jpg' );
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set( 6, 6 );
		
		var material = new THREE.MeshPhongMaterial({ 
			shininess: 2, 
			specular: 0x111111,
			shading: THREE.SmoothShading,
			map: texture,
			wireframe: false
		});

		var mesh = new THREE.Mesh( geometry, material );
		mesh.receiveShadow = true;
		mesh.castShadow = false;
		mesh.flipSided = false;
		mesh.position.set( 0, 0, 0 );
		scene.add( mesh );
		objects.push( mesh );
	}

	// ceiling
	createCeiling();

	function createCeiling()
	{
		var geometry = new THREE.PlaneGeometry( 100, 100, 1, 1 );
		geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

		var material = new THREE.MeshPhongMaterial({ 
			specular: 0xFFFFFF,
			shading: THREE.SmoothShading,
			side: THREE.DoubleSide,
			wireframe: false
		});

		var mesh = new THREE.Mesh( geometry, material );
		mesh.receiveShadow = true;
		mesh.castShadow = false;
		mesh.flipSided = false;
		mesh.position.set( 0, 18.5, 0 );
		scene.add( mesh );
		objects.push( mesh );
	}

	// window
	createWindow();

	function createWindow()
	{
		var geometry = new THREE.PlaneGeometry( 100, 20, 1, 1 );
		var material = new THREE.MeshBasicMaterial({
			color: 0xFFFFFF,
			envMap: cubemap,
			refractionRatio: 0.985,
			transparent: true,
			opacity: 0.050
		});

		var mesh = new THREE.Mesh( geometry, material );
		mesh.receiveShadow = true;
		mesh.castShadow = false;
		mesh.flipSided = false;
		mesh.position.set( 49.5, 10, 0 );
		mesh.rotation.y = - Math.PI * 90 / 180;
		scene.add( mesh );
		objects.push( mesh );
	}

	// objects
	addJsonOBJ( 'assets/models/flat/flat_walls.js', 0, 0, 0, 10, 0);
	testBall();
	makeCharacter();

	function makeCharacter()
	{
		var config = {
			baseUrl: 'assets/models/animated/ratamahatta/',
			body: 'ratamahatta.js',
			skins: [ 'ratamahatta.png' ],
			weapons:  [  	],
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
		character.scale = 0.22;

		character.onLoadComplete = function () {
			character.setSkin( 0 );					
			character.root.position.set( 0, 5, 0 );
			if ( character.meshBody != null ) {
				character.meshBody.rotation.y = Math.PI * 90 / 180;
			}
			scene.add( character.root );
		};

		character.loadParts( config );
		player_model_group.add( character );
	}

	function testBall()
	{
		var reflection_material = new THREE.MeshBasicMaterial({
			color: 0xCCCCCC,
			envMap: cubemap
		});

		sphere = new THREE.Mesh(
			new THREE.SphereGeometry( 2, 32, 32 ),
			reflection_material
		);

		sphere.position.set( 25, 5, 0 );
		scene.add( sphere );

		sphere.toggleLight = function ( intensity ) {
			if ( debug_spot_light.intensity == 0 || debug_point_light.intensity == 0 ) {
				debug_spot_light.intensity = debug_point_light.intensity = intensity;
			} else {
				debug_spot_light.intensity = debug_point_light.intensity = 0;
			}
		}
	}
	
	function addJsonOBJ( path, x, y, z, scale, angle )
	{
		var loader = new THREE.JSONLoader();
		loader.load( path, function ( geometry, materials ) {
			mesh = new THREE.Mesh( geometry, new THREE.MeshFaceMaterial( materials ) );
			mesh.position.set( x, y, z );
			mesh.rotation.y = - Math.PI * angle / 180;
			mesh.scale.set( scale, scale, scale );
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.flipSided = true;
			scene.add( mesh );
			objects.push( mesh );
		});
	}

	
	
	// stats
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	document.body.appendChild( stats.domElement );

	
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
	renderer.setClearColor( 0xffffff );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'click', onWindowClick, false );
	if ( window.addEventListener ) {
		// IE9, Chrome, Safari, Opera
		window.addEventListener( 'mousewheel', onMouseWheel, false );
		// Firefox
		window.addEventListener( 'DOMMouseScroll', onMouseWheel, false );
	}
	// IE 6/7/8
	else window.attachEvent( 'onmousewheel', onMouseWheel );
}

function onWindowResize() 
{
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function onWindowClick( event )
{
	interactionObject();
}

function onMouseWheel( event ) 
{
	var delta = 0;

	if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
		delta = event.wheelDelta;
	} else if ( event.detail !== undefined ) { // Firefox
		delta = - event.detail;
	}

	if ( delta > 0 ) {
		if ( camera.position.z > CAMERA_DISTANCE_MIN ) { 
			camera.position.z -= 1;
		}
	} else {
		if ( camera.position.z < CAMERA_DISTANCE_MAX ) {
			camera.position.z += 1;
		}
	}
}

function interactionObject()
{
	var raycaster = new THREE.Raycaster();
	raycaster.set( camera_controls.getObject().position, camera_controls.getDirection( new THREE.Vector3( 0, 0, 0 ) ) );

	var intersects = raycaster.intersectObject( sphere );

	if ( intersects.length > 0 ) {
		var intersect = intersects[ 0 ];
		var object = intersect.object;
		object.toggleLight( LIGHT_INTENSITY );
	}
}

function animate()
{
	detectCollision();

	var delta = clock.getDelta();
	camera_controls.update( delta );

	if ( character.root !== null ) {
		character.update( delta );
	}

	if ( camera.position.z === 0 ) {
		character.setVisible( false );
	} else {
		character.setVisible( true );
	}

	for ( var player_index = 0; player_index < players_list.length; player_index++ ) {
		if ( players_list[player_index].id != current_player.id && players_list[player_index].model ) {
			players_list[player_index].model.position.x = players_list[player_index].position.x;
			players_list[player_index].model.position.z = players_list[player_index].position.z;
			//players_list[player_index].model.rotation.y = players_list[player_index].rotation.y;
		}
	}
				
	player_model_group.position.x = character.root.position.x;
	player_model_group.position.z = character.root.position.z;
	//player_model_group.rotation.y = character.root.rotation.y;
	
	current_player.position = player_model_group.position;
	//current_player.rotation = player_model_group.rotation;


	stats.update();
	renderer.render( scene, camera );

	// Falling Motion
	/*if ( camera_controls.getObject().position.x > 50 ) {
		camera_controls.getObject().position.y -=  1 + Math.abs( camera_controls.getObject().position.y / 10 );
		camera_controls.enabled = false;
		if ( camera_controls.getObject().position.y < -1500 ) {
			renderer.setClearColor( 0xff0000, 1 );
			camera_controls.getObject().position.x = 0;
			camera_controls.getObject().position.y = 0;
			camera_controls.enabled = true;
		}
	}*/

	requestAnimationFrame( animate );
}

function detectCollision() 
{
	unlockDirections();
	
	var rotationMatrix;
	var cameraDirection = camera_controls.getDirection(new THREE.Vector3(0, 0, 0)).clone();
	
	if (camera_controls.moveForward()) {
		// Nothing to do!
	} else if (camera_controls.moveBackward()) {
		rotationMatrix = new THREE.Matrix4();
		rotationMatrix.makeRotationY( 180 * Math.PI / 180 );
	} else if (camera_controls.moveLeft()) {
		rotationMatrix = new THREE.Matrix4();
		rotationMatrix.makeRotationY( 90 * Math.PI / 180 );
	} else if (camera_controls.moveRight()) {
		rotationMatrix = new THREE.Matrix4();
		rotationMatrix.makeRotationY( (360 - 90) * Math.PI / 180 );
	} else return;
	
	if (rotationMatrix !== undefined){
		cameraDirection.applyMatrix4( rotationMatrix );
	}

	var collisions, i;

	for ( i = 0; i < rays.length; i++ ) {
		// We reset the raycaster to this direction
        caster.set( camera_controls.getObject().position, cameraDirection );
        // Test if we intersect with any obstacle mesh
        collisions = caster.intersectObjects( objects );

		if ( collisions.length > 0 && collisions[0].distance <= DISTANCE ) {
			lockDirections();
			console.log( 'Collision detected @ ' + collisions[0].distance );	
		}
	}
}

function lockDirections() 
{
	if (camera_controls.moveForward()) {
		camera_controls.lockMoveForward( true );
	}
	else if (camera_controls.moveBackward()) {
		camera_controls.lockMoveBackward( true );
	}
	else if (camera_controls.moveLeft()) {
		camera_controls.lockMoveLeft( true );
	}
	else if (camera_controls.moveRight()) {
		camera_controls.lockMoveRight( true );
	}
}

function unlockDirections()
{
	camera_controls.lockMoveForward( false );
	camera_controls.lockMoveBackward( false );
	camera_controls.lockMoveLeft( false );
	camera_controls.lockMoveRight( false );
}


function pointerLockInit()
{
	// http://www.html5rocks.com/en/tutorials/pointerlock/intro/
	var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
	if ( havePointerLock ) {
		var element = document.body;
		var pointerlockchange = function ( event ) {
			if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
				camera_controls.enabled = true;
				blocker.style.display = 'none';
			} else {
				camera_controls.enabled = false;
				blocker.style.display = '-webkit-box';
				blocker.style.display = '-moz-box';
				blocker.style.display = 'box';
				instructions.style.display = '';
			}
		}
		var pointerlockerror = function ( event ) {
			instructions.style.display = '';
		}
		// Hook pointer lock state change events
		document.addEventListener( 'pointerlockchange', pointerlockchange, false );
		document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
		document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
		document.addEventListener( 'pointerlockerror', pointerlockerror, false );
		document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
		document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );
		instructions.addEventListener( 'click', function ( event ) {
			instructions.style.display = 'none';
			// Ask the browser to lock the pointer
			element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
			if ( /Firefox/i.test( navigator.userAgent ) ) {
				var fullscreenchange = function ( event ) {
					if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {
						document.removeEventListener( 'fullscreenchange', fullscreenchange );
						document.removeEventListener( 'mozfullscreenchange', fullscreenchange );
						element.requestPointerLock();
					}
				}
				document.addEventListener( 'fullscreenchange', fullscreenchange, false );
				document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );
				element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
				element.requestFullscreen();
			} else {
				element.requestPointerLock();
			}
		}, false );
	} else {
		instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
	}
}

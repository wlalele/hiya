/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.PointerLockControls = function ( camera ) {

	var scope = this;

	camera.rotation.set( 0, 0, 0 );

	var pitchObject = new THREE.Object3D();
	pitchObject.add( camera );

	var yawObject = new THREE.Object3D();
	yawObject.position.y = 10;
	yawObject.add( pitchObject );

	var moveForward = false;
	var moveBackward = false;
	var moveLeft = false;
	var moveRight = false;

	//MD2 Complex
	var crouch = false;
	var jump = false;
	var attack = false;
	//
	
	var lockMoveForward = false;
	var lockMoveBackward = false;
	var lockMoveLeft = false;
	var lockMoveRight = false;
		
	var isOnObject = false;
	var canJump = false;

	var velocity = new THREE.Vector3();

	var PI_2 = Math.PI / 2;

	var onMouseMove = function ( event ) {

		if ( scope.enabled === false ) return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		yawObject.rotation.y -= movementX * 0.002;
		pitchObject.rotation.x -= movementY * 0.002;

		pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

	};

	var onKeyDown = function ( event ) {

		switch ( event.keyCode ) {

			case 38: // up
			case 90: // z
				moveForward = true;
				break;

			case 37: // left
			case 81: // q
				moveLeft = true; 
				break;

			case 40: // down
			case 83: // s
				moveBackward = true;
				break;

			case 39: // right
			case 68: // d
				moveRight = true;
				break;

			case 32: // space
			case 17: // control
				if ( canJump === true ) { 
					velocity.y += 1;
					jump = true;
				}
				canJump = false;
				break;

		}

	};

	var onKeyUp = function ( event ) {

		switch( event.keyCode ) {

			case 38: // up
			case 90: // z
				moveForward = false;
				break;

			case 37: // left
			case 81: // q
				moveLeft = false;
				break;

			case 40: // down
			case 83: // a
				moveBackward = false;
				break;

			case 39: // right
			case 68: // d
				moveRight = false;
				break;

		}
	};

	document.addEventListener( 'mousemove', onMouseMove, false );
	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );

	this.enabled = false;

	this.getObject = function () {

		return yawObject;

	};
	
	this.isOnObject = function ( boolean ) {

		isOnObject = boolean;
		canJump = boolean;

	};

	this.getDirection = function() {

		// assumes the camera itself is not rotated

		var direction = new THREE.Vector3( 0, 0, -1 );
		var rotation = new THREE.Euler( 0, 0, 0, "YXZ" );

		return function( v ) {

			rotation.set( pitchObject.rotation.x, yawObject.rotation.y, 0 );

			v.copy( direction ).applyEuler( rotation );

			return v;

		}

	}();

	this.update = function ( delta ) {

		if ( scope.enabled === false ) return;
		
		delta *= 100;

		velocity.x += ( - velocity.x ) * 0.1 * delta;
		velocity.z += ( - velocity.z ) * 0.1 * delta;
		//velocity.x = 0;
		//velocity.z = 0;

		velocity.y -= 0.25 * delta;
		
		if ( moveForward && !lockMoveForward ) velocity.z -= 0.12 * delta;
		if ( moveBackward && !lockMoveBackward ) velocity.z += 0.12 * delta;
		
		if ( moveLeft && !lockMoveLeft ) velocity.x -= 0.12 * delta;
		if ( moveRight && !lockMoveRight ) velocity.x += 0.12 * delta;

		if ( isOnObject === true ) {
			velocity.y = Math.max( 0, velocity.y );
		}
		
		yawObject.translateX( velocity.x );
		yawObject.translateY( velocity.y ); 
		yawObject.translateZ( velocity.z );

		if ( yawObject.position.y < 10 ) {
			velocity.y = 0;
			yawObject.position.y = 10;

			canJump = true;
			jump = false;
		}

	};
	
	
	
	this.moveLeft = function() {
		return moveLeft;
	};
	
	this.moveRight = function() {
		return moveRight;
	};
	
	this.moveForward = function() {
		return moveForward;
	};
	
	this.moveBackward = function() {
		return moveBackward;
	};
	
	this.lockMoveForward = function(boolean){
		lockMoveForward = boolean;
	};
	
	this.lockMoveBackward = function(boolean){
		lockMoveBackward = boolean;
	};
	
	this.lockMoveLeft = function(boolean){
		lockMoveLeft = boolean;
	};
	
	this.lockMoveRight = function(boolean){
		lockMoveRight = boolean;
	};

	this.crouch = function() {
		return crouch;
	};
	this.jump = function() {
		return jump;
	};
	this.attack = function() {
		return attack;
	};
};

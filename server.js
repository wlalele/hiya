var http = require( 'http' );
var fs = require( 'fs' );

var TIMEOUT = 5000;

var players_list = Array();
var last_player_id = 0;

var server = http.createServer( function( req, res ) {
	res.writeHead( 200, { 'Content-Type': 'text/plain' });
	res.end( 'Hello World\n' );
}).listen( 8080 );

var io = require( 'socket.io' ).listen( server );

io.sockets.on( 'connection', function ( socket ) {
	
	last_player_id++;

	var new_player = {
		id : last_player_id,
		name : 'John Doe',
		position : { x:0, y:0, z:0 },
		rotation : { x:0, y:0, z:0 },
		lastTime : new Date().getTime()
	};
	
	players_list.push( new_player );
	
    socket.emit( 'connection', new_player );

    socket.on( 'update', function ( datas ) {
		for ( var i = 0; i < players_list.length; i++ ) {
			var current_time = new Date().getTime();
			if ( players_list[i].id == datas.id ) {
				players_list[i].position = datas.position;
				players_list[i].rotation = datas.rotation;
				players_list[i].lastTime = current_time;
			} else {
				if (( players_list[i].lastTime + TIMEOUT ) < current_time ) {
					players_list.splice( i, 1 );
				}
			}
		}
    });	
});

setInterval( function() {
	io.sockets.emit( 'playersUpdate', players_list );
}, 50);

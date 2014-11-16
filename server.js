// Constants
var PORT = 8080;
var TIMEOUT = 5000;
var LOGS_FOLDER = '';
var CHAT_LOGS_FILENAME = 'chat.log';

// Initialization
var http = require('http');

var server = http.createServer(function (res) {
    'use strict';
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.end('Hello World\n');
}).listen(PORT);

var io = require('socket.io').listen(server);

var winston = require('winston');

var chat_logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: LOGS_FOLDER + CHAT_LOGS_FILENAME })
    ]
});

var players_list = [];
var last_player_id = 0;

io.sockets.on('connection', function (socket) {
	'use strict';
    // Broadcast a message to every user
    // socket.broadcast.emit('hi & welcome');
    
    // Server log connection of user
    last_player_id += 1;
    console.log('a user connected, users online = ', last_player_id);
    
    // Server log disconnection of user
    socket.on('disconnect', function() {
        last_player_id -= 1;
        console.log('a user disconnected, users online = ', last_player_id);
    });
    
    var new_player = {
		id : last_player_id,
		name : 'John Doe ' + last_player_id,
		position : { x: 0, y: 0, z: 0 },
		rotation : { x: 0, y: 0, z: 0 },
		lastTime : new Date().getTime()
	};
	
	players_list.push(new_player);
	
    socket.emit('connection', new_player);

    // When a chat message is sent, broadcast it to every user
    socket.on('message', function(msg) {
        io.sockets.emit('message', msg);
        chat_logger.log('info', msg);
    });
    
    socket.on('update', function (datas) {
        var i, current_time = new Date().getTime();
		for (i = 0; i < players_list.length; i += 1) {
			
			if (players_list[i].id === datas.id) {
				players_list[i].position = datas.position;
				players_list[i].rotation = datas.rotation;
				players_list[i].lastTime = current_time;
			} else {
				if ((players_list[i].lastTime + TIMEOUT) < current_time) {
					players_list.splice(i, 1);
				}
			}
		}
    });
});

setInterval(function () {
	'use strict';
    io.sockets.emit('playersUpdate', players_list);
}, 50);

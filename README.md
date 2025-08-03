# Hiya

3D Social game made in WebGL.<br>

This application uses :<br>

- three.js (https://github.com/mrdoob/three.js)<br>
- node.js (https://github.com/joyent/node)<br>
- socket.io (https://github.com/Automattic/socket.io)<br>
- winston (https://github.com/flatiron/winston)<br>

## Install node.js

    sudo apt-get install software-properties-common
    sudo apt-get install python-software-properties python g++ make
    sudo add-apt-repository ppa:chris-lea/node.js
    sudo apt-get update
    sudo apt-get install nodejs

## Install socket.io

    npm install socket.io

## Install winston

    npm install winston

## Configuration

Don't forget to set your server IP into the configuration file.<br>
You can set a folder for the logs into the configuration file but you have to create the folder too.

## Start server

    npm run start:server

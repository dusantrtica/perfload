const express = require('express');
const cluster = require('cluster');
const io_redis = require('socket.io-redis');
const farmhash = require('farmhash');

// net module nam treba zbog TCP veze
// izmedju clustera i mastera
const net = require('net');
const http = require('http');
const socketio = require('socket.io');
const socketMain = require('./socketMain');

const port = 8181;

const numCPUs = require('os').cpus().length;

if(cluster.isMaster) {
    console.log(`Master ${process.id} is running`);
    let workers = [];

    let spawn = (i) => {
        workers[i] = cluster.fork();

        workers[i].on('exit', (code, signal) => {
            spawn(i);
        })
    }

    for(let i = 0; i < numCPUs; i++) {
        spawn(i);
    }

    // fja koja kreira index workera na osnovu
    // index
    const worker_index = (ip, len) => {
        return farmhash.fingerprint32(ip) % len;
    }

    const server = net.createServer({pauseOnConnect: true}, (connection) => {
        const index = worker_index(connection.remoteAddress, numCPUs);

        let worker = workers[index];
        worker.send('sticky-session:connection', connection);
    })

    server.listen(port);
    console.log(`Master listens on port ${port}`);


} else {
    let app = express();

    // workers komuniciraju samo sa masterom
    // zato je listen(0)
    const server = app.listen(0, 'localhost');
    const io = socketio(server);

    io.adapter(io_redis({host: 'localhost', port: 6379}));

    io.on('connection', (socket) => {
        socketMain(io, socket);
    });

    process.on('message', (message, connection) =>{
        if(message !== 'sticky-session:connection') {
            return;
        }

        server.emit('connection', connection);
        connection.resume();
    })
}

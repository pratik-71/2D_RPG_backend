// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors')
const { handleSocketEvents } = require('./SocketHandler/socketHandlers');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
      origin: "*", // Allow all origins during development (be more specific in production)
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"], // Allow necessary headers
      credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    }
  });

app.use(express.json());

// Handle socket eventss
handleSocketEvents(io);

// Start the server
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

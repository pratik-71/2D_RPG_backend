// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { handleSocketEvents } = require('./SocketHandler/socketHandlers');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // Allow all origins during development (be more specific in production)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"], // Allow necessary headers
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }
});

app.use(express.json());

// Default route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Handle socket events
handleSocketEvents(io);

// Start the server
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

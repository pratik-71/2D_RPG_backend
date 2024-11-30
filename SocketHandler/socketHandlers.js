const { Socket } = require("socket.io");
const { generateRoomCode } = require("../GameLogic/RoomLogic");

let rooms = {};        
   

function handleSocketEvents(io) {
  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);


    socket.on("joinRoom", (data) => {
      const { roomCode, name } = data;
      if (rooms[roomCode]) {
        // Add player to the room
        rooms[roomCode].players.push({
          id: socket.id,
          name,
          x: 500,  // Default position
          y: 500,  // Default position
          direction: 'down', // Default direction
        });
        socket.join(roomCode);
        console.log(`Player ${name} joined room: ${roomCode}`);
        io.to(roomCode).emit(
          "updateRoomState",
          roomCode,
          rooms[roomCode].players.length,
          rooms[roomCode].players.map((player) => player.name),
          rooms[roomCode].hostId
        );
        socket.emit("roomJoined", roomCode);
      } else {
        socket.emit("roomNotFound", "Room not found");
        console.log(`Room ${roomCode} not found`);
      }
    });

    // Handle create room event
    socket.on("createRoom", (data) => {
      const roomCode = generateRoomCode();
      rooms[roomCode] = {
        players: [{ id: socket.id, name: data.name, x: null, y: null, direction: 'down' }],
        hostId: socket.id,
      };
      socket.join(roomCode);
      console.log(`Room created with code: ${roomCode} by player: ${data.name}`);

      socket.emit("roomCode", roomCode);
      io.to(roomCode).emit(
        "updateRoomState",
        roomCode,
        rooms[roomCode].players.length,
        rooms[roomCode].players.map((player) => player.name),
        rooms[roomCode].hostId
      );
    });
   
    // Handle destroy room event
    socket.on("destroyRoom", (data) => {
      console.log("inside destroy room");
      const { roomCode, hostId } = data;
      const room = rooms[roomCode];

      if (room && room.hostId === hostId) {
        io.to(roomCode).emit("closeMultiplayerWindow");
        delete rooms[roomCode];
        console.log(`Room ${roomCode} destroyed by host ${hostId}`);
      }
    });

     // Handle player position updates
     socket.on('updatePlayerPosition', (data) => {
      const playerRoom = rooms[data.roomCode]; 
      console.log(socket.id)
     console.log(playerRoom)
      if (playerRoom) {
        const player = playerRoom.players.find(player => player.id === socket.id);
        if (player) {
          console.log("pos - 2 -2")
          player.x = data.x;
          player.y = data.y;
          player.direction = data.direction;
        }
        io.emit('updatePlayers',playerRoom.players );
      } else {
        console.log('Player room not found');
      }
    });
    

    // Handle disconnecting a specific player from a room
    socket.on("disconnectPlayer", (roomCode, playerName, socketid) => {
      console.log("Room Code:", roomCode);
      console.log("Player Name:", playerName);

      if (rooms[roomCode]) {
        const room = rooms[roomCode];
        const playerIndex = room.players.findIndex((player) => player.id === socketid);

        if (playerIndex > -1) {
          io.to(roomCode).emit("playerDisconnected", playerName);
          const playerSocketId = room.players[playerIndex].id;
          room.players.splice(playerIndex, 1);
          io.sockets.sockets.get(playerSocketId)?.disconnect(true);

          if (room.players.length === 0) {
            delete rooms[roomCode];
            console.log(`Room ${roomCode} deleted`);
          } else {
            io.to(roomCode).emit(
              "updateRoomState",
              roomCode,
              room.players.length,
              room.players.map(player => player.name),
              room.hostId
            );
          }
          console.log(`Player ${playerName} disconnected from room ${roomCode}`);
        }
      }
    });

    // Handle start game event
    socket.on("startGame", (roomCode) => {
      console.log("Received start game request for room:", roomCode);
      const room = rooms[roomCode];
      if (room) {
        io.to(roomCode).emit("gameStarted", roomCode, room.players.length, room.players);
      }
    });
  });
}

module.exports = { handleSocketEvents };

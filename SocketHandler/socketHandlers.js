const { generateRoomCode } = require("../GameLogic/RoomLogic");

let rooms = {};

function handleSocketEvents(io) {
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle create room event
    socket.on("createRoom", (data) => {
      const roomCode = generateRoomCode();
      rooms[roomCode] = {
        players: [{ id: socket.id, name: data.name }],
        hostId: socket.id, // Store the host's socket ID
      };
      socket.join(roomCode);
      console.log(
        `Room created with code: ${roomCode} by player: ${data.name}`
      );

      socket.emit("roomCode", roomCode);
      io.to(roomCode).emit(
        "updateRoomState",
        roomCode,
        rooms[roomCode].players.length,
        rooms[roomCode].players.map((player) => player.name),
        rooms[roomCode].hostId
      );
    });

    // Handle join room event
    socket.on("joinRoom", (data) => {
      const { roomCode, name } = data;
      if (rooms[roomCode]) {
        rooms[roomCode].players.push({ id: socket.id, name });
        socket.join(roomCode);
        console.log(`Player ${name} joined room: ${roomCode}`);

        io.to(roomCode).emit(
          "updateRoomState",
          roomCode,
          rooms[roomCode].players.length,
          rooms[roomCode].players.map((player) => player.name),
          rooms[roomCode].hostId,
        );
        socket.emit("roomJoined", roomCode);
      } else {
        socket.emit("roomNotFound", "Room not found");
        console.log(`Room ${roomCode} not found`);
      }
    });

    // Handle leave room event
    socket.on("destroyRoom", (data) => {
      console.log("inside destroy room")
      const { roomCode, hostId } = data; 
      console.log("inside destroy room",hostId)
      const room = rooms[roomCode];
      
      if (room) {
        if (room.hostId === hostId) {
          io.to(roomCode).emit("closeMultiplayerWindow"); 
          delete rooms[roomCode];  
          console.log(`Room ${roomCode} destroyed by host ${hostId}`);
        } 
      } 
    });
    
  
    socket.on("disconnectPlayer", (roomCode, playerName,socketid) => {
      console.log("Room Code:", roomCode);
      console.log("Player Name:", playerName);
    
      if (rooms[roomCode]) {
        const room = rooms[roomCode];
        const playerIndex = room.players.findIndex(
          (player) => player.id === socketid
        );
    
        if (playerIndex > -1) {
          // Notify other players that someone has disconnected
          io.to(roomCode).emit("playerDisconnected", playerName);
          
          const playerSocketId = room.players[playerIndex].id;
          room.players.splice(playerIndex, 1); // Remove player from the room
          io.sockets.sockets.get(playerSocketId)?.disconnect(true);
          if (room.players.length === 0) {
            delete rooms[roomCode];
            console.log(`Room ${roomCode} deleted`);
          } else {
            const playerNames = room.players.map(player => player.name);  
            const hostId = room.hostId; 
            console.log(room)
            io.to(roomCode).emit(
              "updateRoomState", 
              roomCode, 
              room.players.length,  
              playerNames,  
              hostId  
            );
          }
    
          console.log(`Player ${playerName} disconnected from room ${roomCode}`);
        }
      }
    });
    

    // Handle start game event
    socket.on("startGame", (roomCode) => {
      console.log("got strt request");
      const room = rooms[roomCode];
      console.log("inside ");
      io.to(roomCode).emit("gameStarted", roomCode);
    });
  });
}

module.exports = { handleSocketEvents };

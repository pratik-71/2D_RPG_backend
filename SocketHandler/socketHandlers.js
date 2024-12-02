const { Socket } = require("socket.io");
const { generateRoomCode } = require("../GameLogic/RoomLogic");

let rooms = {};



function  handleSocketEvents(io) {
  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);



    socket.on("joinRoom", (data) => {
      const { roomCode, name } = data;
      if (rooms[roomCode]) {
        rooms[roomCode].players.push({
          id: socket.id,
          name,
          x: 500, 
          y: 500, 
          direction: "down",
          health:100
        });
        socket.join(roomCode);

       if(rooms[roomCode].isGameStarted){
         io.to(roomCode).emit('GameHasStarted',{id:socket.id,name,x:500,y:500,direction:'down',health:100})
         io.to(socket.id).emit(
          "gameStarted",
          roomCode,
          rooms[roomCode].players.length,
          rooms[roomCode].players
        );
       }else{
        io.to(roomCode).emit(
          "updateRoomState",
          roomCode,
          rooms[roomCode].players.length,
          rooms[roomCode].players.map((player) => player.name),
          rooms[roomCode].hostId
        );     
       }
      }        
      else {
        socket.emit("roomNotFound", "Room not found");
        console.log(`Room ${roomCode} not found`);
      }
    });

    // Handle create room event
    socket.on("createRoom", (data) => {
      const roomCode = generateRoomCode();
      rooms[roomCode] = {
        players: [
          {
            id: socket.id,
            name: data.name,
            x: null,
            y: null,
            direction: "down",
            health:100,
            isDead:false,
          },
        ],
        hostId: socket.id,
        trees: {
          // Define the trees and their initial health
          tree1: { health: 20 },
          tree2: { health: 20 },
          tree3: { health: 20 },
          tree4: { health: 20 },
          tree5: { health: 20 },
          tree6: { health: 20 },
          tree7: { health: 20 },
          tree8: {health:20},
          tree9: { health: 20 },
          tree10: { health: 20 },
          tree11: { health: 20 },
          tree12: { health: 20 },
          tree13: { health: 20 },
          tree14: { health: 20 },
          tree15: { health: 20 },
          tree16: { health: 20 },
        },
        isGameStarted:false
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
    socket.on("updatePlayerPosition", (data) => {
      const playerRoom = rooms[data.roomCode];

      if (playerRoom) {
        const player = playerRoom.players.find(
          (player) => player.id === socket.id
        );

        if (player) {
          player.x = data.x;
          player.y = data.y;
          player.direction = data.direction;
          player.isMoving = data.isMoving;
          io.to(data.roomCode).emit("updatePlayers", playerRoom.players);
        }
      } else {
        console.log("Player room not found");
      }
    });

    // Handle disconnecting a specific player from a room
    socket.on("disconnectPlayer", (roomCode, playerName, socketid) => {
      console.log("Room Code:", roomCode);
      console.log("Player Name:", playerName);

      if (rooms[roomCode]) {
        const room = rooms[roomCode];
        const playerIndex = room.players.findIndex(
          (player) => player.id === socketid
        );

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
              room.players.map((player) => player.name),
              room.hostId
            );
          }
          console.log(
            `Player ${playerName} disconnected from room ${roomCode}`
          );
        }
      }
    });

    // Handle start game event
    socket.on("startGame", (roomCode) => {
      console.log("Received start game request for room:", roomCode);
      const room = rooms[roomCode];
      room.isGameStarted = true;
      if (room) {
        io.to(roomCode).emit(
          "gameStarted",
          roomCode,
          room.players.length,
          room.players
        );
      }
    });

    // Handle player attack
    socket.on("playerAttack", (data) => {
      const playerRoom = rooms[data.roomCode]; // Fetch the room using roomCode

      if (playerRoom) {
        socket.broadcast.emit("playerAttacked", {
          socketId: data.socketId,
          x: data.x,
          y: data.y,
          direction: data.direction,
          attackAnimationKey: data.attackAnimationKey,
        });
        console.log(
          `Player ${data.socketId} attacked in the ${data.direction} direction`
        );
      } else {
        console.log("Player room not found");
      }
    });


    socket.on("damageTree", (data) => {
      console.log("-----------",data)
      const { treeId, damage, roomCode } = data;
      const room = rooms[roomCode];

      if (room && room.trees[treeId]) {
        const tree = room.trees[treeId];
        tree.health -= damage; // Apply damage to the tree's health

        console.log(`Tree ${treeId} health: ${tree.health}`);

        if (tree.health <= 0) {
          tree.health = 0;
          console.log(`Tree ${treeId} destroyed`);

          // Give players health bonus when a tree is destroyed
          room.players.forEach((player) => {
            player.health = Math.min(player.health + 20, 100); // Cap health at 100
          });
          
          io.to(roomCode).emit("updatePlayers", room.players);
        }
        io.to(roomCode).emit("updateTreeHealth", { treeId, health: tree.health });
      }
    });

    socket.on("updatePlayerIsDead", (data) => {
      const { socketId, isDead, roomCode } = data;
      const room = rooms[roomCode];
      
      if (room) {
        const player = room.players.find(player => player.id === socketId);
        if (player) {
          player.isDead = isDead;
          console.log(`Player ${player.name} with ID ${socketId} is now dead in room ${roomCode}`);
          io.to(roomCode).emit("PlayerIsDead", { id: socketId, isDead });
        } else {
          console.log(`Player with ID ${socketId} not found in room ${roomCode}`);
        }
      } else {
        console.log(`Room ${roomCode} not found`);
      }
    });


    socket.on("updateTreesOnStart",(data)=>{
      const {roomCode} = data

      console.log("--- --- --- ")
      console.log(data)
      const treesArray = Object.keys(rooms[data].trees).map((key) => ({
        id: key,
        health: rooms[data].trees[key].health
      }))
     io.to(data).emit("updateTreeSprites", treesArray);
    })
    
    
  });
}

module.exports = { handleSocketEvents };

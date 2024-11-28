let roomCodes = [];  // Store generated room codes

// Function to generate a unique room code
function generateRoomCode() {
  let roomCode;
  do {
    roomCode = Math.floor(10000 + Math.random() * 90000).toString();  // Random 5-digit code
  } while (roomCodes.includes(roomCode));  // Ensure uniqueness

  roomCodes.push(roomCode);  // Store the code to prevent duplicates
  return roomCode;
}

module.exports = { generateRoomCode };

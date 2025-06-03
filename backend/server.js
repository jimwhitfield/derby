// ====================================================================================
// FILE: /backend/server.js
// ====================================================================================
// This is the main entry point for our Node.js backend.
// It sets up an Express server and a WebSocket server.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Placeholder for Game Logic - you'll port Meteor game logic here
const GameRoom = require('./gameLogic/gameRoom'); // Assuming you'll create this

const PORT = process.env.PORT || 3001;

const app = express();
// You can add middleware here if needed, e.g., for REST API endpoints
// app.use(express.json());

const server = http.createServer(app);

// WebSocket Server Setup
const wss = new WebSocket.Server({ server });

// Store active game rooms and player connections
// In a real app, you might use a more robust in-memory store or a database
const gameRooms = new Map(); // Map<roomId, GameRoomInstance>
const clients = new Map(); // Map<wsConnection, { userId: string, roomId: string | null }>

console.log(`Backend server starting on port ${PORT}`);

wss.on('connection', (ws) => {
    const userId = uuidv4();
    clients.set(ws, { userId, roomId: null });
    console.log(`Client ${userId} connected`);

    ws.send(JSON.stringify({ type: 'CONNECTION_ESTABLISHED', payload: { userId } }));

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            console.log(`Received message from ${userId}:`, parsedMessage);

            // Handle different message types from the client
            switch (parsedMessage.type) {
                case 'CREATE_ROOM':
                    {
                        const roomId = uuidv4().substring(0, 6); // Simple room ID
                        const newRoom = new GameRoom(roomId);
                        newRoom.addPlayer(userId, ws);
                        gameRooms.set(roomId, newRoom);
                        clients.get(ws).roomId = roomId;
                        ws.send(JSON.stringify({ type: 'ROOM_CREATED', payload: { roomId, userId, gameState: newRoom.getGameStateForPlayer(userId) } }));
                        console.log(`Room ${roomId} created by ${userId}`);
                    }
                    break;
                case 'JOIN_ROOM':
                    {
                        const { roomIdToJoin } = parsedMessage.payload;
                        const room = gameRooms.get(roomIdToJoin);
                        if (room && !room.isFull()) { // Add isFull() method to GameRoom
                            room.addPlayer(userId, ws);
                            clients.get(ws).roomId = roomIdToJoin;
                            ws.send(JSON.stringify({ type: 'ROOM_JOINED', payload: { roomId: roomIdToJoin, userId, gameState: room.getGameStateForPlayer(userId) } }));
                            // Notify other players in the room
                            room.broadcastState();
                            console.log(`User ${userId} joined room ${roomIdToJoin}`);
                        } else {
                            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found or full' } }));
                        }
                    }
                    break;
                case 'PLAYER_ACTION': // e.g., programming cards, power down
                    {
                        const clientData = clients.get(ws);
                        if (clientData && clientData.roomId) {
                            const room = gameRooms.get(clientData.roomId);
                            if (room) {
                                room.handlePlayerAction(userId, parsedMessage.payload);
                                // GameRoom should handle broadcasting updates after an action
                            }
                        }
                    }
                    break;
                // Add more cases for game-specific actions
                default:
                    console.log(`Unknown message type: ${parsedMessage.type}`);
                    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Unknown action' } }));
            }
        } catch (error) {
            console.error('Failed to parse message or handle action:', error);
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid message format' } }));
        }
    });

    ws.on('close', () => {
        const clientData = clients.get(ws);
        if (clientData) {
            console.log(`Client ${clientData.userId} disconnected`);
            if (clientData.roomId) {
                const room = gameRooms.get(clientData.roomId);
                if (room) {
                    room.removePlayer(clientData.userId);
                    if (room.isEmpty()) { // Add isEmpty() method to GameRoom
                        gameRooms.delete(clientData.roomId);
                        console.log(`Room ${clientData.roomId} closed as it's empty.`);
                    } else {
                        room.broadcastState(); // Notify remaining players
                    }
                }
            }
            clients.delete(ws);
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clients.get(ws)?.userId}:`, error);
    });
});

server.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
    console.log(`WebSocket server is running and listening on port ${PORT}`);
});

// Basic REST API endpoint (optional, if you need it)
app.get('/api/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

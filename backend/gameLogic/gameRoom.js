// ====================================================================================
// FILE: /backend/gameLogic/gameRoom.js (Added isFull method)
// ====================================================================================
// This class will encapsulate the logic for a single game room/instance.
// You'll need to port the core game state, player management, turn progression,
// card handling, board interactions, etc., from the Meteor project here.
const { v4: uuidv4 } = require('uuid'); // Ensure uuid is available if used here

class GameRoom {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = new Map(); // Map<userId, { ws: WebSocket, playerData: object }>
        this.gameState = this.initializeGameState(); // Define this method
        this.maxPlayers = 6; // Example, adjust as per RoboRally rules
        console.log(`GameRoom ${roomId} initialized.`);
    }

    initializeGameState() {
        return {
            board: null, 
            flags: [],
            players: {}, 
            currentPhase: 'LOBBY', 
            turnOrder: [],
            activePlayer: null,
            gameLog: [`Room ${this.roomId} created.`],
            maxPlayers: this.maxPlayers 
        };
    }

    addPlayer(userId, ws) {
        if (this.isFull()) { // Use the implemented isFull method
            console.warn(`Room ${this.roomId} is full. Cannot add player ${userId}.`);
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room is full' } }));
            return false;
        }
        const initialPlayerData = { 
            id: userId, 
            name: `Player ${userId.substring(0,4)}`, 
            lives: 3, 
            damage: 0, 
            hand: [], 
            program: Array(5).fill(null), 
            readyForNextPhase: false,
            x: 0, 
            y: 0,
            direction: 'NORTH' 
        };
        this.players.set(userId, { ws, playerData: initialPlayerData });
        this.gameState.players[userId] = this.players.get(userId).playerData; 
        this.gameState.gameLog.push(`${initialPlayerData.name} joined the room.`);
        console.log(`Player ${userId} added to room ${this.roomId}. Total players: ${this.players.size}`);
        this.broadcastState();
        return true;
    }

    removePlayer(userId) {
        if (this.players.has(userId)) {
            const playerName = this.players.get(userId).playerData.name;
            this.players.delete(userId);
            delete this.gameState.players[userId]; 
            this.gameState.gameLog.push(`${playerName} left the room.`);
            console.log(`Player ${userId} removed from room ${this.roomId}. Total players: ${this.players.size}`);
            this.broadcastState();
        }
    }

    handlePlayerAction(userId, action) {
        console.log(`Room ${this.roomId}: Player ${userId} performed action:`, action);
        const player = this.gameState.players[userId];
        if (!player) {
            console.warn(`Player ${userId} not found in game state for action.`);
            return;
        }

        switch(action.type) {
            case 'SUBMIT_PROGRAM':
                player.program = action.cards; 
                player.readyForNextPhase = true;
                this.gameState.gameLog.push(`${player.name} submitted their program.`);
                this.checkAllPlayersReady();
                break;
            case 'POWER_DOWN_INTENTION':
                player.announcedPowerDown = true; 
                this.gameState.gameLog.push(`${player.name} announced intention to power down next turn.`);
                break;
        }
        this.broadcastState(); 
    }

    checkAllPlayersReady() {
        const activePlayers = Object.values(this.gameState.players).filter(p => p.lives > 0); 
        if (activePlayers.length === 0 && this.players.size > 0) { 
            console.log(`Room ${this.roomId}: No active players left.`);
            return;
        }
        const allReady = activePlayers.every(p => p.readyForNextPhase);
        
        if (activePlayers.length > 0 && allReady && this.gameState.currentPhase === 'PROGRAMMING') {
            this.gameState.gameLog.push(`All players ready. Advancing from PROGRAMMING phase.`);
            this.advanceToNextPhase(); 
        }
    }
    
    advanceToNextPhase() {
        if (this.gameState.currentPhase === 'PROGRAMMING') {
            this.gameState.currentPhase = 'REVEAL_EXECUTE'; 
            this.gameState.gameLog.push(`Phase changed to REVEAL_EXECUTE.`);
            Object.values(this.gameState.players).forEach(p => {
                p.readyForNextPhase = false;
                if (p.announcedPowerDown) {
                    this.gameState.gameLog.push(`${p.name} is now powered down.`);
                    p.isPoweredDown = true; 
                    p.announcedPowerDown = false;
                }
            });
            this.dealCardsToPlayers(); 
            this.gameState.currentPhase = 'PROGRAMMING'; 
            this.gameState.gameLog.push(`New turn. Phase changed back to PROGRAMMING.`);

        }
        this.broadcastState();
    }

    dealCardsToPlayers() {
        Object.values(this.gameState.players).forEach(player => {
            if (player.lives > 0 && !player.isPoweredDown) { 
                const numCardsToDeal = Math.max(0, 9 - player.damage);
                player.hand = this.generateRandomHand(numCardsToDeal); 
                this.gameState.gameLog.push(`Dealt ${numCardsToDeal} cards to ${player.name}.`);
            } else if (player.isPoweredDown) {
                player.hand = []; 
            }
        });
    }

    generateRandomHand(numCards) {
        const cardTypes = ['MOVE_1', 'MOVE_2', 'MOVE_3', 'BACKUP', 'TURN_LEFT', 'TURN_RIGHT', 'U_TURN'];
        const hand = [];
        for (let i = 0; i < numCards; i++) {
            hand.push({
                id: `card-${uuidv4().substring(0,8)}`, 
                type: cardTypes[Math.floor(Math.random() * cardTypes.length)],
                priority: Math.floor(Math.random() * 800) + 10 
            });
        }
        return hand;
    }

    getGameStateForPlayer(userId) {
        const playerState = this.players.get(userId);
        return { 
            ...this.gameState, 
            myId: userId,
            players: {
                ...this.gameState.players,
                ...(playerState && this.gameState.players[userId] && { 
                    [userId]: {
                        ...this.gameState.players[userId],
                        hand: playerState.playerData.hand 
                    }
                })
            }
        };
    }

    broadcastState() {
        this.players.forEach((playerInfo, id) => {
            try {
                if (playerInfo.ws.readyState === WebSocket.OPEN) {
                    playerInfo.ws.send(JSON.stringify({
                        type: 'GAME_STATE_UPDATE',
                        payload: this.getGameStateForPlayer(id)
                    }));
                }
            } catch (error) {
                console.error(`Error broadcasting to player ${id}:`, error);
            }
        });
        console.log(`Room ${this.roomId}: Broadcasted state to ${this.players.size} players.`);
    }
    
    isFull() { // Implemented isFull method
        return this.players.size >= this.maxPlayers;
    }

    isEmpty() {
        return this.players.size === 0;
    }
}
module.exports = GameRoom;

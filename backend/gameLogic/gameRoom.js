// ====================================================================================
// FILE: /backend/gameLogic/gameRoom.js (MODIFIED with movement logic)
// ====================================================================================
const { v4: uuidv4 } = require('uuid'); 

class GameRoom {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = new Map(); 
        this.minPlayersToStart = 2; 
        this.maxPlayers = 6; 
        this.boardWidth = 12; // Example board width
        this.boardHeight = 12; // Example board height
        this.gameState = this.initializeGameState(); 
        console.log(`GameRoom ${roomId} initialized.`);
    }

    initializeGameState() {
        // For now, board is just conceptual dimensions.
        // Later, it could be a 2D array representing tiles, walls, conveyors, etc.
        const board = {
            width: this.boardWidth,
            height: this.boardHeight,
            // Example: tiles: Array(this.boardHeight).fill(null).map(() => Array(this.boardWidth).fill({ type: 'floor' }))
        };

        return {
            board: board, 
            flags: [], // Example: [{x: 10, y: 10, id: 1}, {x:1, y:1, id: 2}]
            players: {}, 
            currentPhase: 'LOBBY', 
            turnOrder: [], // Will store player IDs in order of execution for a register
            activePlayer: null, // Not strictly needed if all players act simultaneously based on priority
            gameLog: [`Room ${this.roomId} created. Waiting for players...`],
            maxPlayers: this.maxPlayers,
            minPlayersToStart: this.minPlayersToStart,
            currentRegister: 0, // To track which register (1-5) is being processed
        };
    }

    addPlayer(userId, ws) {
        if (this.isFull()) {
            console.warn(`Room ${this.roomId} is full. Cannot add player ${userId}.`);
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room is full' } }));
            return false;
        }
        if (this.gameState.currentPhase !== 'LOBBY' && !this.players.has(userId)) {
            console.warn(`Room ${this.roomId} game already started. Cannot add new player ${userId}.`);
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Game has already started.' } }));
            return false;
        }

        // Assign unique starting positions for simplicity
        const numPlayers = this.players.size;
        const startX = numPlayers % this.gameState.board.width; // Simple distribution
        const startY = Math.floor(numPlayers / this.gameState.board.width);

        const initialPlayerData = { 
            id: userId, 
            name: `Player ${userId.substring(0,4)}`, 
            lives: 3, 
            damage: 0, 
            hand: [], 
            program: Array(5).fill(null), 
            readyForNextPhase: false,
            x: startX, 
            y: startY,
            direction: 'SOUTH', // Start facing South for this example
            archivedAtX: startX, // For respawning
            archivedAtY: startY,
            archivedAtDirection: 'SOUTH',
            flagsCollected: [],
        };
        this.players.set(userId, { ws, playerData: initialPlayerData });
        this.gameState.players[userId] = this.players.get(userId).playerData; 
        this.gameState.gameLog.push(`${initialPlayerData.name} joined (at ${startX},${startY}).`);
        console.log(`Player ${userId} added to room ${this.roomId}. Total players: ${this.players.size}`);
        
        if (this.gameState.currentPhase === 'LOBBY' && this.players.size >= this.minPlayersToStart) {
            this.startGame();
        } else {
            this.broadcastState(); 
        }
        return true;
    }

    startGame() {
        console.log(`Room ${this.roomId}: Starting game with ${this.players.size} players.`);
        this.gameState.currentPhase = 'PROGRAMMING';
        this.gameState.gameLog.push(`Minimum players reached. Game starting! Phase: PROGRAMMING.`);
        // TODO: Initialize flags on the board if not done in initializeGameState
        // Example: this.gameState.flags = [{x: 10, y: 10, id: 1, order: 1}, {x:1, y:1, id: 2, order: 2}];
        this.dealCardsToPlayers();
        this.broadcastState();
    }

    removePlayer(userId) {
        if (this.players.has(userId)) {
            const playerName = this.players.get(userId).playerData.name;
            this.players.delete(userId);
            delete this.gameState.players[userId]; 
            this.gameState.gameLog.push(`${playerName} left the room.`);
            console.log(`Player ${userId} removed from room ${this.roomId}. Total players: ${this.players.size}`);
            if (this.gameState.currentPhase !== 'LOBBY' && this.players.size < this.minPlayersToStart) {
                this.gameState.gameLog.push(`Not enough players to continue. Game may be paused or ended.`);
            }
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
        if (this.gameState.currentPhase !== 'PROGRAMMING' && action.type === 'SUBMIT_PROGRAM') {
            console.warn(`Player ${userId} tried to submit program outside of PROGRAMMING phase.`);
            return; 
        }

        switch(action.type) {
            case 'SUBMIT_PROGRAM':
                player.program = action.cards.map(submittedCard => {
                    const cardFromHand = player.hand.find(c => c.id === submittedCard.id); 
                    return cardFromHand || submittedCard; 
                });
                player.readyForNextPhase = true;
                this.gameState.gameLog.push(`${player.name} locked in their program.`);
                this.checkAllPlayersReady();
                break;
            case 'POWER_DOWN_INTENTION':
                player.announcedPowerDown = !player.announcedPowerDown; // Toggle intention
                this.gameState.gameLog.push(`${player.name} ${player.announcedPowerDown ? 'announced' : 'cancelled'} intention to power down next turn.`);
                break;
        }
        this.broadcastState(); 
    }

    checkAllPlayersReady() {
        const activeProgrammingPlayers = Object.values(this.gameState.players).filter(p => p.lives > 0 && !p.isPoweredDown); 
        if (activeProgrammingPlayers.length === 0 && this.players.size > 0) { 
            console.log(`Room ${this.roomId}: No active players left to program for this turn.`);
            // If all remaining players are powered down or out of lives, might need special handling
            // For now, if no one can program, we might just cycle to cleanup/next turn
            if (this.gameState.currentPhase === 'PROGRAMMING') this.advanceToNextPhase();
            return;
        }
        const allReady = activeProgrammingPlayers.every(p => p.readyForNextPhase);
        
        if (activeProgrammingPlayers.length > 0 && allReady && this.gameState.currentPhase === 'PROGRAMMING') {
            this.gameState.gameLog.push(`All players ready. Advancing from PROGRAMMING phase.`);
            this.advanceToNextPhase(); 
        }
    }
    
    advanceToNextPhase() {
        if (this.gameState.currentPhase === 'PROGRAMMING') {
            this.gameState.currentPhase = 'REVEAL_EXECUTE'; 
            this.gameState.gameLog.push(`--- Turn Start: REVEAL & EXECUTE ---`);
            
            this.executeAllRegisters(); // New method to handle all 5 registers

            // After all 5 registers are processed:
            this.gameState.gameLog.push(`--- End of Turn Actions ---`);
            Object.values(this.gameState.players).forEach(p => {
                p.readyForNextPhase = false; 
                p.program = Array(5).fill(null); 

                if (p.announcedPowerDown) {
                    p.damage = 0; 
                    p.isPoweredDown = true; 
                    this.gameState.gameLog.push(`${p.name} is now powered down and repaired.`);
                    p.announcedPowerDown = false;
                } else if (p.isPoweredDown) {
                    p.isPoweredDown = false;
                    this.gameState.gameLog.push(`${p.name} is now active again after power down.`);
                }
                // TODO: Implement repair sites (if robot ends on one)
            });
            
            // TODO: Check for win conditions 
            // For now, just log flag status
            Object.values(this.gameState.players).forEach(p => {
                if (p.flagsCollected.length > 0) {
                    this.gameState.gameLog.push(`${p.name} has collected flags: ${p.flagsCollected.join(', ')}`);
                }
            });


            this.dealCardsToPlayers(); 
            this.gameState.currentPhase = 'PROGRAMMING'; 
            this.gameState.gameLog.push(`--- New Turn Starting: PROGRAMMING Phase ---`);

        }
        this.broadcastState();
    }

    executeAllRegisters() {
        for (let reg = 0; reg < 5; reg++) {
            this.gameState.currentRegister = reg + 1;
            this.gameState.gameLog.push(`--- Register ${this.gameState.currentRegister} ---`);

            // 1. Collect actions for this register from all active, non-powered-down players
            const registerActions = [];
            Object.values(this.gameState.players).forEach(player => {
                if (player.lives > 0 && !player.isPoweredDown && player.program && player.program[reg]) {
                    registerActions.push({
                        playerId: player.id,
                        card: player.program[reg]
                    });
                }
            });

            // 2. Sort actions by card priority (highest priority first)
            registerActions.sort((a, b) => b.card.priority - a.card.priority);

            // 3. Execute actions in order
            for (const action of registerActions) {
                const player = this.gameState.players[action.playerId];
                if (player && player.lives > 0 && !player.isPoweredDown) { // Double check player status
                    this.gameState.gameLog.push(`${player.name} plays ${action.card.type} (Prio: ${action.card.priority})`);
                    this.executeCardAction(player, action.card);
                    // TODO: After each individual robot move, check for pushing other robots.
                    // TODO: After each individual robot move, check for interaction with board elements like flags.
                }
            }

            // 4. TODO: Board Element Phase (Conveyors, Gears, Pushers)
            // this.activateBoardElementsForRegister(reg + 1);
            this.gameState.gameLog.push(`(Board elements for Register ${reg+1} would activate here)`);


            // 5. TODO: Lasers Fire Phase (Board and Robot Lasers)
            // this.fireAllLasers();
            this.gameState.gameLog.push(`(Lasers for Register ${reg+1} would fire here)`);
            
            this.broadcastState(); // Broadcast after each register for more granular updates
        }
        this.gameState.currentRegister = 0; // Reset after all registers
    }

    executeCardAction(player, card) {
        const boardMaxX = this.gameState.board.width - 1;
        const boardMaxY = this.gameState.board.height - 1;

        switch (card.type.toUpperCase()) {
            case 'MOVE_1':
            case 'MOVE_2':
            case 'MOVE_3':
                let steps = 0;
                if (card.type.toUpperCase() === 'MOVE_1') steps = 1;
                if (card.type.toUpperCase() === 'MOVE_2') steps = 2;
                if (card.type.toUpperCase() === 'MOVE_3') steps = 3;
                
                for (let i = 0; i < steps; i++) {
                    let prevX = player.x;
                    let prevY = player.y;
                    if (player.direction === 'NORTH') player.y = Math.max(0, player.y - 1);
                    else if (player.direction === 'SOUTH') player.y = Math.min(boardMaxY, player.y + 1);
                    else if (player.direction === 'EAST') player.x = Math.min(boardMaxX, player.x + 1);
                    else if (player.direction === 'WEST') player.x = Math.max(0, player.x - 1);
                    // TODO: Check for walls between prevX,prevY and player.x,player.y. If wall, stop.
                    // TODO: Check for pushing other robots.
                    this.gameState.gameLog.push(`${player.name} moved ${player.direction} to (${player.x}, ${player.y})`);
                }
                break;
            case 'BACKUP':
                if (player.direction === 'NORTH') player.y = Math.min(boardMaxY, player.y + 1);
                else if (player.direction === 'SOUTH') player.y = Math.max(0, player.y - 1);
                else if (player.direction === 'EAST') player.x = Math.max(0, player.x - 1);
                else if (player.direction === 'WEST') player.x = Math.min(boardMaxX, player.x + 1);
                // TODO: Check for walls / pushing.
                this.gameState.gameLog.push(`${player.name} backed up to (${player.x}, ${player.y})`);
                break;
            case 'TURN_LEFT':
                if (player.direction === 'NORTH') player.direction = 'WEST';
                else if (player.direction === 'WEST') player.direction = 'SOUTH';
                else if (player.direction === 'SOUTH') player.direction = 'EAST';
                else if (player.direction === 'EAST') player.direction = 'NORTH';
                this.gameState.gameLog.push(`${player.name} turned left, now facing ${player.direction}`);
                break;
            case 'TURN_RIGHT':
                if (player.direction === 'NORTH') player.direction = 'EAST';
                else if (player.direction === 'EAST') player.direction = 'SOUTH';
                else if (player.direction === 'SOUTH') player.direction = 'WEST';
                else if (player.direction === 'WEST') player.direction = 'NORTH';
                this.gameState.gameLog.push(`${player.name} turned right, now facing ${player.direction}`);
                break;
            case 'U_TURN':
                if (player.direction === 'NORTH') player.direction = 'SOUTH';
                else if (player.direction === 'SOUTH') player.direction = 'NORTH';
                else if (player.direction === 'EAST') player.direction = 'WEST';
                else if (player.direction === 'WEST') player.direction = 'EAST';
                this.gameState.gameLog.push(`${player.name} made a U-Turn, now facing ${player.direction}`);
                break;
            default:
                this.gameState.gameLog.push(`Card type ${card.type} execution not implemented.`);
        }
        // TODO: After any move, check if player landed on a flag they need
        // this.checkFlagCapture(player);
    }


    dealCardsToPlayers() {
        Object.values(this.gameState.players).forEach(player => {
            if (player.lives > 0 && !player.isPoweredDown) { 
                const numCardsToDeal = Math.max(0, 9 - player.damage);
                player.hand = this.generateRandomHand(numCardsToDeal); 
                this.gameState.gameLog.push(`Dealt ${numCardsToDeal} cards to ${player.name}.`);
            } else if (player.isPoweredDown) {
                player.hand = []; 
                this.gameState.gameLog.push(`${player.name} is powered down, no cards dealt.`);
            } else {
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
                priority: Math.floor(Math.random() * 740) + 100 // Priorities from 100 to 840
            });
        }
        return hand;
    }

    getGameStateForPlayer(userId) {
        const playerPublicStates = {};
        this.players.forEach((pInfo, pId) => {
            playerPublicStates[pId] = {
                ...pInfo.playerData,
                hand: pId === userId ? pInfo.playerData.hand : [], 
            };
        });

        return { 
            ...this.gameState, 
            myId: userId,
            players: playerPublicStates, 
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
        // console.log(`Room ${this.roomId}: Broadcasted state to ${this.players.size} players.`); // Can be noisy
    }
    
    isFull() { 
        return this.players.size >= this.maxPlayers;
    }

    isEmpty() {
        return this.players.size === 0;
    }
}
module.exports = GameRoom;

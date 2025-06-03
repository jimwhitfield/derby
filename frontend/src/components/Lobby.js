// ====================================================================================
// FILE: /frontend/src/components/Lobby.js (CORRECTED for unused var & gameState)
// ====================================================================================
import React, { useContext, useState } from 'react';
import { GameContext } from '../contexts/GameContext';
import { Users, LogIn, PlusSquare } from 'lucide-react';

const Lobby = () => {
  const { sendWebSocketMessage, gameState, userId, roomId, error } = useContext(GameContext);
  const [roomIdToJoin, setRoomIdToJoin] = useState('');

  const handleCreateRoom = () => {
    sendWebSocketMessage({ type: 'CREATE_ROOM' });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomIdToJoin.trim()) {
      sendWebSocketMessage({ type: 'JOIN_ROOM', payload: { roomIdToJoin: roomIdToJoin.trim() } });
    }
  };

  // If we have a roomId and gameState, we are in a room (could be lobby phase or active game)
  if (roomId && gameState) {
    const players = gameState.players ? Object.values(gameState.players) : [];
    const me = players.find(p => p.id === userId); // gameState.myId is also available
    const maxPlayers = gameState.maxPlayers || 6;

    // If game is active (not LOBBY), App.js will render the game board, not this Lobby component.
    // This part is mostly for when currentPhase IS 'LOBBY'.
    return (
        <div className="card max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">Room: {roomId}</h2>
            {me && <p className="mb-2">Welcome, {me.name || `Player ${userId.substring(0,4)}`}!</p>}
            <p className="mb-4 text-sm text-gray-400">
                {gameState.currentPhase === 'LOBBY' ? `Waiting for other players... (${players.length}/${maxPlayers})` : `Game in progress...`}
            </p>
            {gameState.currentPhase === 'LOBBY' && (
                <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2">Players in room:</h3>
                    {players.length > 0 ? (
                        <ul className="list-disc list-inside text-gray-300">
                            {players.map(player => (
                                <li key={player.id} className={player.id === userId ? 'font-bold text-green-400' : ''}>
                                    {player.name || `Player ${player.id.substring(0,4)}`} {player.id === userId && '(You)'}
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400 italic">No players yet.</p>}
                </div>
            )}
             <p className="mt-4 text-xs text-gray-500">
                {gameState.currentPhase === 'LOBBY' ? 'The game will start when the host decides (or automatically if configured).' : 'You have joined an active game.'}
             </p>
        </div>
    );
  }
  
  // Not in a room yet (no roomId or no gameState), show options to create or join
  return (
    <div className="card max-w-md mx-auto text-center">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Game Lobby</h2>
      {error && <p className="text-red-400 bg-red-900 p-3 rounded-md mb-4">{error}</p>}
      <div className="space-y-4">
        <button 
          onClick={handleCreateRoom} 
          className="btn btn-primary w-full flex items-center justify-center"
        >
          <PlusSquare size={20} className="mr-2" /> Create New Room
        </button>
        
        <form onSubmit={handleJoinRoom} className="space-y-3">
          <input 
            type="text" 
            value={roomIdToJoin}
            onChange={(e) => setRoomIdToJoin(e.target.value)}
            placeholder="Enter Room ID"
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-gray-400"
          />
          <button 
            type="submit" 
            className="btn btn-secondary w-full flex items-center justify-center"
            disabled={!roomIdToJoin.trim()}
          >
            <LogIn size={20} className="mr-2" /> Join Room
          </button>
        </form>
      </div>
       <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 flex items-center"><Users size={20} className="mr-2 text-blue-400"/> How to Play with Friends:</h3>
            <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1">
                <li>One player creates a room.</li>
                <li>Share the 6-character Room ID with friends.</li>
                <li>Friends enter the Room ID to join.</li>
                <li>Let the chaotic robot racing begin!</li>
            </ol>
        </div>
    </div>
  );
};
export default Lobby;

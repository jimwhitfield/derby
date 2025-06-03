
// ====================================================================================
// FILE: /frontend/src/components/PlayerDashboard.js (CORRECTED)
// ====================================================================================
import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';
import { Heart, Shield } from 'lucide-react';
import ProgramCard from './ProgramCard';

const PlayerDashboard = () => {
  const { gameState, userId } = useContext(GameContext);

  if (!gameState || !gameState.players || !userId) {
    return <div className="card animate-pulse"><p>Loading player data...</p></div>;
  }

  const me = gameState.players[userId];

  if (!me) { // Should not happen if userId is set and gameState.players exists
    return <div className="card"><p>Waiting for your player data to sync...</p></div>;
  }
  
  const hand = me.hand || []; 
  // Ensure program is an array of 5, filling with null if cards aren't there
  const program = Array.isArray(me.program) ? 
                  [...me.program, ...Array(Math.max(0, 5 - me.program.length)).fill(null)].slice(0,5) : 
                  Array(5).fill(null);


  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-3 text-blue-400">My Robot: {me.name || `Player ${userId.substring(0,4)}`}</h3>
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center p-2 bg-gray-700 rounded-md">
          <Heart size={20} className="mr-2 text-red-500" />
          Lives: <span className="font-semibold ml-1">{me.lives !== undefined ? me.lives : 'N/A'}</span>
        </div>
        <div className="flex items-center p-2 bg-gray-700 rounded-md">
          <Shield size={20} className="mr-2 text-yellow-500" />
          Damage: <span className="font-semibold ml-1">{me.damage !== undefined ? me.damage : 'N/A'}</span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-gray-300">Program Registers:</h4>
        <div className="grid grid-cols-5 gap-1 sm:gap-2 bg-gray-700 p-2 rounded-md">
          {program.map((cardInRegister, index) => (
            <div key={`program-${index}`} className="w-full"> {/* Ensure ProgramCard can take full width of grid cell */}
              <ProgramCard card={cardInRegister} /> {/* cardInRegister is expected to be a card object or null */}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2 text-gray-300">Cards in Hand ({hand.length}):</h4>
        {hand.length > 0 ? (
            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-2 bg-gray-700 p-2 rounded-md">
            {hand.map((cardInHand) => ( // cardInHand is a card object
                <ProgramCard 
                    key={cardInHand.id || `hand-${cardInHand.type}-${Math.random()}`} // Ensure unique key
                    card={cardInHand} 
                    // onClick for selection will be on the versions in Controls.js
                />
            ))}
            </div>
        ) : (
            <p className="text-gray-500 text-sm italic p-2 bg-gray-700 rounded-md text-center">No cards in hand.</p>
        )}
      </div>
    </div>
  );
};
export default PlayerDashboard;

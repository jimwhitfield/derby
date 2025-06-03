// ====================================================================================
// FILE: /frontend/src/components/Controls.js (CORRECTED)
// ====================================================================================
import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../contexts/GameContext';
import { CheckSquare, Power, RotateCcw } from 'lucide-react';
import ProgramCard from './ProgramCard';

const Controls = () => {
  const { sendWebSocketMessage, gameState, userId } = useContext(GameContext);
  const [selectedCardsForProgram, setSelectedCardsForProgram] = useState([]); // Stores full card objects

  const me = gameState?.players?.[userId];
  const hand = me?.hand || [];
  const programmingPhaseActive = gameState?.currentPhase === 'PROGRAMMING' && me && !me.readyForNextPhase;

  // Reset local selection if server state indicates program was submitted or phase changed
  useEffect(() => {
    if (me && me.readyForNextPhase && gameState?.currentPhase === 'PROGRAMMING') {
        // If player is marked ready, it implies their program is on server, clear local if different
        // Or, more simply, clear local selection when programming phase ends or player becomes ready
        setSelectedCardsForProgram([]);
    }
    if (gameState?.currentPhase !== 'PROGRAMMING') {
        setSelectedCardsForProgram([]);
    }
  }, [me, gameState?.currentPhase]);


  const handleSelectCard = (cardFromHand) => {
    if (selectedCardsForProgram.length < 5) {
        // Ensure we don't add the same card instance twice if hand might have duplicates (unlikely with unique IDs)
        if (!selectedCardsForProgram.find(c => c.id === cardFromHand.id)) {
             setSelectedCardsForProgram(prevSelected => [...prevSelected, cardFromHand]);
        }
    }
  };

  const handleRemoveFromProgram = (cardToRemove) => {
    setSelectedCardsForProgram(prevSelected => prevSelected.filter(card => card.id !== cardToRemove.id));
  };
  
  const handleClearProgram = () => {
    setSelectedCardsForProgram([]);
  };

  const handleSubmitProgram = () => {
    if (selectedCardsForProgram.length === 5) {
      sendWebSocketMessage({ 
        type: 'PLAYER_ACTION', 
        payload: { 
            type: 'SUBMIT_PROGRAM', 
            cards: selectedCardsForProgram // Send array of full card objects, or just IDs: selectedCardsForProgram.map(c => c.id)
        }
      });
      // Don't clear setSelectedCardsForProgram here; let server state drive UI update.
    } else {
        // Replace alert with a more integrated UI message
        console.warn("Program must have 5 cards.");
        // setErrorStateInUI("Program must have 5 cards."); 
    }
  };
  
  const handlePowerDown = () => {
      sendWebSocketMessage({ type: 'PLAYER_ACTION', payload: { type: 'POWER_DOWN_INTENTION' } });
  };

  // Cards available to be picked (not yet in the program)
  const availableHandCards = hand.filter(hCard => !selectedCardsForProgram.find(sCard => sCard.id === hCard.id));

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-3 text-center text-blue-400">Actions</h3>
      
      {programmingPhaseActive ? (
        <>
          <div className="mb-3">
            <h4 className="font-semibold text-sm mb-1">Your Program ({selectedCardsForProgram.length}/5):</h4>
            <div className="grid grid-cols-5 gap-1 sm:gap-2 bg-gray-700 p-1.5 rounded">
              {Array(5).fill(null).map((_, index) => {
                const cardInSlot = selectedCardsForProgram[index];
                return (
                  <div key={`sel-${index}`} className="w-full">
                    <ProgramCard 
                        card={cardInSlot} 
                        onClick={cardInSlot ? () => handleRemoveFromProgram(cardInSlot) : undefined} 
                        isSelected={!!cardInSlot}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-3">
            <h4 className="font-semibold text-sm mb-1">Available Cards (Click to add to program):</h4>
            {availableHandCards.length > 0 ? (
                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-2 bg-gray-700 p-1.5 rounded">
                {availableHandCards.map((card) => (
                    <ProgramCard 
                        key={card.id} 
                        card={card}
                        onClick={() => handleSelectCard(card)}
                    />
                ))}
                </div>
            ) : <p className="text-xs text-gray-500 italic text-center p-2">No more cards to select from hand.</p>}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
             <button 
                onClick={handleClearProgram}
                className="btn bg-yellow-600 hover:bg-yellow-700 text-black flex-1 flex items-center justify-center"
                disabled={selectedCardsForProgram.length === 0}
             >
                <RotateCcw size={18} className="mr-1.5"/> Clear
             </button>
             <button 
                onClick={handleSubmitProgram} 
                className="btn btn-primary flex-1 flex items-center justify-center"
                disabled={selectedCardsForProgram.length !== 5}
            >
                <CheckSquare size={18} className="mr-1.5"/> Lock Program
            </button>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-500 italic p-4">
            {(me && me.readyForNextPhase && gameState?.currentPhase === 'PROGRAMMING') ? "Waiting for other players..." : "Not in programming phase or waiting for game to start."}
        </p>
      )}
      
      <button 
        onClick={handlePowerDown}
        className="btn bg-red-600 hover:bg-red-700 text-white w-full mt-3 flex items-center justify-center"
        disabled={!(me && gameState?.currentPhase !== 'LOBBY')}
      >
        <Power size={18} className="mr-1.5"/> Announce Power Down
      </button>
    </div>
  );
};
export default Controls;

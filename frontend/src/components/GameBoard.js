// ====================================================================================
// FILE: /frontend/src/components/GameBoard.js (CORRECTED)
// ====================================================================================
import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';
// import ProgramCard from './ProgramCard'; // ProgramCard is not directly used on board for now

const GameBoard = () => {
  const { gameState } = useContext(GameContext);

  if (!gameState || !gameState.board) { // Simple placeholder if board data isn't structured yet
    const placeholderCells = Array(12 * 12).fill(null); // 144 cells for a 12x12 grid
    return (
        <div className="aspect-square bg-gray-700 rounded-lg p-1 sm:p-2 grid grid-cols-12 gap-px sm:gap-0.5 overflow-hidden shadow-inner">
            {placeholderCells.map((_, index) => (
                <div key={index} className="aspect-square bg-gray-600 rounded-xs sm:rounded-sm flex items-center justify-center">
                   {/* Placeholder for cell content, like coordinates for debugging */}
                   {/* <span className="text-gray-500 text-xxs">{Math.floor(index/12)},{index%12}</span> */}
                </div>
            ))}
        </div>
    );
  }
  
  // More complex rendering would go here once gameState.board is defined
  // const { grid, robots, flags } = parseBoardState(gameState.board); 

  return (
    <div className="aspect-square bg-gray-700 rounded-lg p-2 sm:p-4 shadow-inner">
      <p className="text-center">Game Board Area</p>
      <p className="text-center text-sm text-gray-400">(Actual board rendering based on `gameState.board` TBD)</p>
      {/* Example: if gameState.board is a 2D array of cell objects
        <div className={`grid grid-cols-${gameState.board.width} gap-0.5`}>
            {gameState.board.cells.map(cell => (
                <div key={cell.id} className={`aspect-square ${getCellStyle(cell)}`}>
                    {renderCellContent(cell, gameState.robots, gameState.flags)}
                </div>
            ))}
        </div>
      */}
      <div className="mt-4 p-2 bg-gray-600 rounded max-h-60 overflow-y-auto">
        <h3 className="font-semibold mb-1 text-sm">Debug: Raw Game State</h3>
        <pre className="text-xs bg-gray-900 p-2 rounded overflow-auto">
            {JSON.stringify(gameState, null, 2)}
        </pre>
      </div>
    </div>
  );
};
export default GameBoard;

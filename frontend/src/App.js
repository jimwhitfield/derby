// ====================================================================================
// FILE: /frontend/src/App.js (Slightly adjusted rendering logic)
// ====================================================================================
import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from './contexts/GameContext';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import PlayerDashboard from './components/PlayerDashboard';
import Controls from './components/Controls';
import GameLog from './components/GameLog';
import { AlertTriangle, Info, WifiOff } from 'lucide-react'; // Added WifiOff

function App() {
  const { gameState, connectWebSocket, error, userId, roomId, isConnected } = useContext(GameContext);
  const [showError, setShowError] = useState(false);
  const [showConnectionInfo, setShowConnectionInfo] = useState(true);


  useEffect(() => {
    // connectWebSocket is memoized, so this effect runs once on mount
    // or if connectWebSocket identity changes (which it shouldn't often)
    if (!isConnected) { // Only attempt to connect if not already connected
        connectWebSocket();
    }
  }, [connectWebSocket, isConnected]);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    // Hide connection info once userId is established and no error
    if (userId && !error) {
        const timer = setTimeout(() => setShowConnectionInfo(false), 2000); // Show for 2s then hide
        return () => clearTimeout(timer);
    }
    // Keep it visible if there's an error or still connecting
    if (error || !userId) {
        setShowConnectionInfo(true);
    }
  }, [userId, error]);


  const renderContent = () => {
    // If not connected and no userId yet, show a more persistent connecting/error state
    if (!isConnected && !userId) {
        return (
            <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-4">
                <WifiOff size={48} className="text-yellow-500 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Connecting to Server...</h2>
                <p className="text-gray-400">
                    {error ? `Error: ${error}` : "Attempting to establish a connection. Please wait."}
                </p>
                {error && <p className="text-gray-500 text-sm mt-2">Try refreshing if this persists.</p>}
            </div>
        );
    }

    // Once userId is available, we can proceed to lobby or game
    if (userId) {
        if (!roomId || !gameState || gameState?.currentPhase === 'LOBBY') {
            return <Lobby />;
        }
        // If we have roomId and gameState, and phase is not LOBBY, render game
        return (
            <div className="flex flex-col lg:flex-row gap-4 p-2 sm:p-4 max-w-screen-2xl mx-auto">
                <div className="flex-grow card">
                    <h2 className="text-2xl font-bold mb-4 text-center">RoboRally Arena (Room: {roomId})</h2>
                    <GameBoard />
                </div>
                <div className="lg:w-1/3 xl:w-1/4 flex flex-col gap-4">
                    <PlayerDashboard />
                    <Controls />
                    <GameLog />
                </div>
            </div>
        );
    }
    
    // Fallback, should ideally be covered by the !isConnected && !userId case
    return (
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
            <p className="text-xl text-gray-500">Initializing...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800 p-4 shadow-md">
        <h1 className="text-3xl font-bold text-center text-blue-400">RoboRally Reimagined</h1>
        {userId && <p className="text-center text-xs text-gray-500 mt-1">My User ID: {userId} {isConnected ? '(Connected)' : '(Disconnected)'}</p>}
      </header>
      
      {showError && error && (
        <div className="fixed top-20 sm:top-4 right-4 bg-red-600 text-white p-3 sm:p-4 rounded-lg shadow-xl z-50 flex items-start max-w-sm">
          <AlertTriangle size={20} className="mr-2 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm sm:text-base">Error</h3>
            <p className="text-xs sm:text-sm">{error}</p>
          </div>
          <button onClick={() => setShowError(false)} className="ml-2 text-lg sm:text-xl font-bold">&times;</button>
        </div>
      )}
      {showConnectionInfo && !error && userId && !gameState?.currentPhase && !roomId && (
         <div className="fixed top-20 sm:top-4 right-4 bg-green-500 text-black p-3 sm:p-4 rounded-lg shadow-xl z-50 flex items-center max-w-sm">
            <Info size={20} className="mr-2 flex-shrink-0" />
            <p className="text-xs sm:text-sm">Connected! Waiting for game details...</p>
        </div>
      )}

      <main className="p-2 sm:p-4">
        {renderContent()}
      </main>
      <footer className="text-center p-4 text-sm text-gray-500 border-t border-gray-700 mt-8">
        RoboRally Clone - Proof of Concept
      </footer>
    </div>
  );
}

export default App;

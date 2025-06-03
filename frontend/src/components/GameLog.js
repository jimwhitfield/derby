// ====================================================================================
// FILE: /frontend/src/components/GameLog.js (CORRECTED for exhaustive-deps)
// ====================================================================================
import React, { useContext, useEffect, useRef, useMemo } from 'react';
import { GameContext } from '../contexts/GameContext';
import { MessageSquare } from 'lucide-react';

const GameLog = () => {
    const { gameState } = useContext(GameContext);
    const logEntries = useMemo(() => gameState?.gameLog || ["Game log initializing..."], [gameState?.gameLog]);
    const logContainerRef = useRef(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logEntries]);

    return (
        <div className="card">
            <h3 className="text-lg font-semibold mb-2 flex items-center text-blue-400">
                <MessageSquare size={20} className="mr-2"/>Game Log
            </h3>
            <div ref={logContainerRef} className="h-48 bg-gray-700 p-3 rounded-md overflow-y-auto text-xs space-y-1">
                {logEntries.map((entry, index) => (
                    <p key={index} className="border-b border-gray-600 pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0 break-words">
                        {typeof entry === 'object' ? JSON.stringify(entry) : entry}
                    </p>
                ))}
            </div>
        </div>
    );
};
export default GameLog;

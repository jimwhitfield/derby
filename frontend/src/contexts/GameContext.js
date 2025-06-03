// ====================================================================================
// FILE: /frontend/src/contexts/GameContext.js (CORRECTED for WebSocket logic)
// ====================================================================================
import React, { createContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';

export const GameContext = createContext();

const WEBSOCKET_URL = process.env.NODE_ENV === 'production'
  ? window.location.origin.replace(/^http/, 'ws')
  : 'ws://localhost:3001';

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState(null);
  const [userId, setUserId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false); // To track intentional closures

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000; // ms

  const connectWebSocketFnRef = useRef(null); // For stable reference in callbacks

  const handleReconnect = useCallback(() => {
    if (intentionalCloseRef.current) {
        console.log("Skipping reconnect due to intentional closure.");
        return;
    }
    if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
        setError(`Connection lost. Reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => {
            if (connectWebSocketFnRef.current) {
                connectWebSocketFnRef.current();
            }
        }, RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current -1) ); // Exponential backoff
    } else {
        console.error('Max reconnect attempts reached. Please refresh the page or check your connection.');
        setError('Could not reconnect to the server. Please refresh.');
    }
  }, [setError]); // setError is stable

  const connectWebSocket = useCallback(() => {
    // Prevent multiple concurrent connection attempts
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting. Ignoring additional attempt.');
      return;
    }
    intentionalCloseRef.current = false; // Reset intentional close flag on new attempt

    console.log(`Attempting to connect to WebSocket at ${WEBSOCKET_URL}...`);
    socketRef.current = new WebSocket(WEBSOCKET_URL);

    socketRef.current.onopen = () => {
      console.log('WebSocket connection established.');
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
    };

    socketRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message from server:', message);
        switch (message.type) {
          case 'CONNECTION_ESTABLISHED':
            setUserId(message.payload.userId);
            break;
          case 'ROOM_CREATED':
          case 'ROOM_JOINED':
            setRoomId(message.payload.roomId);
            setGameState(message.payload.gameState); 
            setError(null);
            break;
          case 'GAME_STATE_UPDATE':
            setGameState(message.payload); 
            setError(null);
            break;
          case 'ERROR':
            console.error('Error from server:', message.payload.message);
            setError(message.payload.message);
            break;
          default:
            console.warn('Unknown message type from server:', message.type);
        }
      } catch (e) {
        console.error('Error parsing message from server or updating state:', e);
        setError('Error processing server message.');
      }
    };

    socketRef.current.onerror = (errEvent) => {
      console.error('WebSocket error event:', errEvent);
      // Don't set generic error here, onclose will usually provide more specific info or trigger reconnect
      // setError('WebSocket connection error.'); 
    };

    socketRef.current.onclose = (event) => {
      console.log('WebSocket connection closed.', event.reason ? `Reason: ${event.reason},` : '', `Code: ${event.code}, WasClean: ${event.wasClean}`);
      setIsConnected(false);
      
      if (intentionalCloseRef.current) {
          console.log("WebSocket closed intentionally by client. No reconnect.");
          intentionalCloseRef.current = false; // Reset for next time
          return;
      }

      // Code 1000: Normal Closure
      // Code 1001: Going Away (e.g., server shutting down, browser navigating away)
      // Code 1005: No Status Rcvd (often implies abnormal closure without a status code)
      // Code 1006: Abnormal Closure (e.g., connection lost, server process killed)
      if (event.code === 1000 || event.code === 1001) {
          // Normal closure or server/browser going away, usually no need to reconnect.
          // setError("Connection closed."); // Optional: inform user
      } else {
          // For other codes (like 1006, or 1005 if not clean), attempt reconnect.
          handleReconnect();
      }
    };
  }, [handleReconnect, setError, setIsConnected, setUserId, setRoomId, setGameState]); // Dependencies for connectWebSocket

  // Store connectWebSocket in a ref so handleReconnect can call the latest version
  useEffect(() => {
    connectWebSocketFnRef.current = connectWebSocket;
  }, [connectWebSocket]);
  
  // Cleanup WebSocket on component unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log("Closing WebSocket connection intentionally from GameContext cleanup.");
        intentionalCloseRef.current = true; // Mark as intentional before closing
        socketRef.current.close(1000, "Client unmounting");
        socketRef.current = null; // Clear the ref
      }
    };
  }, []); // Empty dependency array, runs once on mount and cleanup on unmount

  const sendWebSocketMessage = useCallback((message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected. Cannot send message.');
      setError('Not connected to server. Try again shortly.');
      // Optionally, try to reconnect if not already attempting and not intentionally closed
      if (!isConnected && !intentionalCloseRef.current && reconnectAttemptsRef.current === 0 && connectWebSocketFnRef.current) {
          connectWebSocketFnRef.current();
      }
    }
  }, [isConnected]); // isConnected is the main dependency

  const gameContextValue = useMemo(() => ({
    gameState, userId, roomId, error, isConnected, 
    connectWebSocket, 
    sendWebSocketMessage
  }), [gameState, userId, roomId, error, isConnected, connectWebSocket, sendWebSocketMessage]);

  return (
    <GameContext.Provider value={gameContextValue}>
      {children}
    </GameContext.Provider>
  );
};

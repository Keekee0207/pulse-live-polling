const WS_BASE_URL = () => {
  const envUrl = import.meta.env.VITE_WS_BASE_URL;
  if (envUrl) return envUrl;
  
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8085/api';
  return apiBase.replace(/^http/, 'ws');
};

export const createPollWebSocket = (pollId, onMessage, onStatusChange) => {
  let socket = null;
  let isClosedIntentionally = false;
  let reconnectTimeout = null;
  let retryCount = 0;

  const connect = () => {
    const wsUrl = `${WS_BASE_URL()}/ws/polls/${pollId}`;
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        retryCount = 0;
        if (onStatusChange) onStatusChange('connected');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
        } catch (err) {
          console.error("Failed to parse WS payload:", err);
        }
      };

      socket.onerror = (err) => {
        console.warn("WebSocket error:", err);
      };

      socket.onclose = () => {
        if (onStatusChange) onStatusChange('disconnected');
        if (!isClosedIntentionally) {
          const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
          retryCount++;
          reconnectTimeout = setTimeout(connect, timeout);
        }
      };
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
      if (!isClosedIntentionally) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }
  };

  connect();

  return {
    close: () => {
      isClosedIntentionally = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    }
  };
};

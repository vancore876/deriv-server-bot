import WebSocket from "ws";

let ws = null;
let onMessageHandler = null;
let onStatusHandler = null;
let onErrorHandler = null;
let appId = "1089";

export function initDerivClient({ derivAppId, onMessage, onStatus, onError }) {
  appId = derivAppId || "1089";
  onMessageHandler = onMessage;
  onStatusHandler = onStatus;
  onErrorHandler = onError;
}

export function connectDeriv() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return ws;
  }

  ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);

  ws.on("open", () => {
    if (onStatusHandler) onStatusHandler("connected");
  });

  ws.on("close", () => {
    if (onStatusHandler) onStatusHandler("closed");
  });

  ws.on("error", (err) => {
    if (onErrorHandler) onErrorHandler(err.message);
  });

  ws.on("message", (raw) => {
    try {
      const parsed = JSON.parse(raw.toString());
      if (onMessageHandler) onMessageHandler(parsed);
    } catch (err) {
      if (onErrorHandler) onErrorHandler(err.message);
    }
  });

  return ws;
}

export function sendToDeriv(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function closeDeriv() {
  if (ws) {
    try {
      ws.close();
    } catch (err) {
      // ignore close errors
    }
    ws = null;
  }
}
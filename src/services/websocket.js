const { WebSocketServer } = require('ws');
const subscribers = new Map();
function initWebSocket(server) {
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    let subDriver = null;
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'subscribe_driver') {
          subDriver = msg.driver_id;
          if (!subscribers.has(subDriver)) subscribers.set(subDriver, new Set());
          subscribers.get(subDriver).add(ws);
          ws.send(JSON.stringify({ type: 'subscribed', driver_id: subDriver }));
        }
      } catch {}
    });
    ws.on('close', () => { if (subDriver) subscribers.get(subDriver)?.delete(ws); });
  });
  server._broadcast = (driver_id, location) => {
    const clients = subscribers.get(driver_id);
    if (!clients) return;
    const msg = JSON.stringify({ type: 'location', driver_id, ...location });
    clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
  };
  console.log('WebSocket server initialized');
  return wss;
}
module.exports = { initWebSocket };
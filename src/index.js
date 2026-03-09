const app = require('./app');
const { createServer } = require('http');
const { initWebSocket } = require('./services/websocket');
const { PORT } = require('./config/env');
const server = createServer(app);
initWebSocket(server);
server.listen(PORT, () => console.log('YOBU running on port ' + PORT));
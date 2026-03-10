require('./config/env');
const http = require('http');
const app = require('./app');
const { setupWebSocket } = require('./services/websocket');
const { PORT } = require('./config/env');
const server = http.createServer(app);
setupWebSocket(server, app);
server.listen(PORT, () => {
  console.log(`YOBU Backend running on port ${PORT}`);
});
process.on('unhandledRejection', (err) => { console.error(err); server.close(() => process.exit(1)); });

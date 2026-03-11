require('./config/env');
const http=require('http'),app=require('./app'),{setupWebSocket}=require('./services/websocket'),{PORT}=require('./config/env');
const server=http.createServer(app);
setupWebSocket(server,app);
server.listen(PORT,'0.0.0.0',()=>{console.log('YOBU Backend running on port '+PORT);});
process.on('unhandledRejection',(e)=>{console.error(e);server.close(()=>process.exit(1));});

// Socket.IO Server for Real-time Chat
// Usage: node server-socket.js
/* eslint-disable @typescript-eslint/no-require-imports */

const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';

// Parse command-line arguments for --port flag
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const portFromArgs = portArg ? parseInt(portArg.split('=')[1], 10) : null;
const port = portFromArgs || parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Get network IP address
function getNetworkAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'https://log-dev.expressa.id',
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    // Windows-friendly configuration
    transports: ['websocket', 'polling'],
    allowEIO3: true, // Allow Engine.IO v3 clients
    pingTimeout: 60000, // Increased for Windows
    pingInterval: 25000, // Increased for Windows
    upgradeTimeout: 30000, // Increased for Windows
    maxHttpBufferSize: 1e6, // 1MB buffer
    // Connection state recovery for better reliability
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    }
  });

  // Socket.IO connection handling with better error management
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id, 'Transport:', socket.conn.transport.name);
    
    // Handle transport upgrade for Windows compatibility
    socket.conn.on('upgrade', () => {
      console.log('🔄 Transport upgraded to:', socket.conn.transport.name);
    });
    
    // Handle connection errors
    socket.on('error', (error) => {
      console.error('❌ Socket error for', socket.id, ':', error);
    });

    // Join tasklist room
    socket.on('join-tasklist', (tasklistId) => {
      const room = `tasklist-${tasklistId}`;
      socket.join(room);
      console.log(`📝 Socket ${socket.id} joined room: ${room}`);
    });

    // Leave tasklist room
    socket.on('leave-tasklist', (tasklistId) => {
      const room = `tasklist-${tasklistId}`;
      socket.leave(room);
      console.log(`📤 Socket ${socket.id} left room: ${room}`);
    });

    // Handle new chat message
    socket.on('new-message', (data) => {
      const { tasklistId, message } = data;
      const room = `tasklist-${tasklistId}`;
      
      // Broadcast to all clients in the room except sender
      socket.to(room).emit('message-received', message);
      console.log(`💬 Message sent to room ${room}:`, message.id);
    });

    // Handle chat notification for global notification dropdown
    socket.on('chat-notification', (data) => {
      const { tasklistId, senderId } = data;
      
      // Broadcast to all connected clients except sender
      socket.broadcast.emit('chat-notification', {
        tasklistId,
        senderId
      });
      console.log(`🔔 Chat notification broadcasted for task ${tasklistId}`);
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { tasklistId, user } = data;
      const room = `tasklist-${tasklistId}`;
      socket.to(room).emit('user-typing', user);
    });

    // Handle stop typing
    socket.on('stop-typing', (data) => {
      const { tasklistId } = data;
      const room = `tasklist-${tasklistId}`;
      socket.to(room).emit('user-stop-typing');
    });

    // Handle disconnect with better logging
    socket.on('disconnect', (reason) => {
      console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
      
      // Log different disconnect reasons for debugging
      if (reason === 'io server disconnect') {
        console.log('📝 Server initiated disconnect for', socket.id);
      } else if (reason === 'io client disconnect') {
        console.log('📝 Client initiated disconnect for', socket.id);
      } else if (reason === 'ping timeout') {
        console.log('⏰ Ping timeout for', socket.id, '- possible network issue');
      } else if (reason === 'transport close') {
        console.log('🔌 Transport closed for', socket.id);
      } else if (reason === 'transport error') {
        console.log('❌ Transport error for', socket.id);
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      const networkAddress = getNetworkAddress();
      const envFiles = [];
      if (dev) {
        envFiles.push('.env.development');
      }
      envFiles.push('.env');
      
      console.log(`
   ▲ Next.js 15.2.3 + Socket.IO
   - Local:        http://${hostname}:${port}
   - Network:      http://${networkAddress}:${port}
   - Environments: ${envFiles.join(', ')}

 ✓ Socket.IO ready
 ✓ Server started successfully
      `);
    });
});

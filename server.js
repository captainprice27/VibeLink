const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Store user socket mappings
    const userSockets = new Map();
    const conversationRooms = new Map();

    io.on('connection', (socket) => {
        console.log('✅ Socket connected:', socket.id);

        // User joins with their ID
        socket.on('user:online', (userId) => {
            userSockets.set(userId, socket.id);
            socket.userId = userId;
            console.log(`User ${userId} online with socket ${socket.id}`);

            // Broadcast to all users that this user is online
            socket.broadcast.emit('user:status', { userId, status: 'online' });
        });

        // Join conversation room
        socket.on('conversation:join', (conversationId) => {
            socket.join(conversationId);
            console.log(`Socket ${socket.id} joined conversation ${conversationId}`);

            // Track which conversations this socket is in
            if (!conversationRooms.has(socket.id)) {
                conversationRooms.set(socket.id, []);
            }
            conversationRooms.get(socket.id).push(conversationId);
        });

        // Handle new message
        socket.on('message:send', (data) => {
            const { conversationId, message, senderId } = data;
            console.log(`Broadcasting message in conversation ${conversationId}`);

            // Broadcast to all users in the conversation except sender
            socket.to(conversationId).emit('message:new', {
                conversationId,
                message,
                senderId,
            });

            // Send delivery confirmation to sender
            socket.emit('message:sent', {
                tempId: data.tempId,
                messageId: message.id,
                status: 'sent'
            });
        });

        // Handle message delivery acknowledgment
        socket.on('message:delivered', (data) => {
            const { conversationId, messageIds, userId } = data;

            // Notify sender that message was delivered
            socket.to(conversationId).emit('message:status:delivered', {
                messageIds,
                userId,
                status: 'delivered',
                timestamp: new Date().toISOString(),
            });
        });

        // Handle message seen acknowledgment
        socket.on('message:seen', (data) => {
            const { conversationId, messageIds, userId } = data;
            console.log(`User ${userId} s

aw messages ${messageIds} in ${conversationId}`);

            // Notify sender that message was seen
            socket.to(conversationId).emit('message:status:seen', {
                messageIds,
                userId,
                status: 'seen',
                timestamp: new Date().toISOString(),
            });
        });

        // Handle typing indicator
        socket.on('typing:start', (data) => {
            const { conversationId, userId, userName } = data;
            socket.to(conversationId).emit('typing:user', {
                conversationId,
                userId,
                userName,
                isTyping: true,
            });
        });

        socket.on('typing:stop', (data) => {
            const { conversationId, userId } = data;
            socket.to(conversationId).emit('typing:user', {
                conversationId,
                userId,
                isTyping: false,
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected:', socket.id);

            if (socket.userId) {
                userSockets.delete(socket.userId);
                // Broadcast to all users that this user is offline
                socket.broadcast.emit('user:status', {
                    userId: socket.userId,
                    status: 'offline'
                });
            }

            // Clean up conversation rooms
            conversationRooms.delete(socket.id);
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    httpServer
        .once('error', (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
            console.log(`> Socket.IO server running`);
        });
});

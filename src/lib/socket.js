export function setupSocket(io, messages, encrypt3DES) {
    io.on('connection', (socket) => {
        socket.on('sendMessage', async ({ sender, message }) => {
            const encrypted = encrypt3DES(message);
            await messages.insertOne({ sender, message: encrypted });
            io.emit('newMessage', { sender, message });
        });
    });
}

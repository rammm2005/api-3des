import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { connectToDatabase } from './lib/db.js';
import { setupSocket } from './lib/socket.js';
import authRoutes from './routes/auth.js';
import { encrypt3DES } from './lib/crypto.js';

const app = express();
app.use(cors(
  { origin: ["https://3des-chatapp.vercel.app/", "http://localhost:3000"], },
));
app.use(express.json());
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["https://3des-chatapp.vercel.app/", "http://localhost:3000"], },
});

const { db, users, messages } = await connectToDatabase();

app.set('io', io);

app.use('/api', authRoutes(db));

setupSocket(io, messages, encrypt3DES);

server.listen(4000, () => console.log('🚀 Server running on http://localhost:4000'));

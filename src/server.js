import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import { connectToDatabase } from './lib/db.js'
import { setupSocket } from './lib/socket.js'
import authRoutes from './routes/auth.js'
import { encrypt3DES } from './lib/crypto.js'

const app = express()

// ✅ FIX: NO SLASH
app.use(cors({
  origin: ["https://3des-chatapp.vercel.app", "http://localhost:3000"],
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ["https://3des-chatapp.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
})

const { db, users, messages } = await connectToDatabase()
app.set('io', io)

app.use('/api', authRoutes(db))

setupSocket(io, messages, encrypt3DES)

const PORT = process.env.PORT || 4000
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

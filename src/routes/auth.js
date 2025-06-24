import express from 'express';
import nodemailer from 'nodemailer';
import { generateOTP, encrypt3DES, decrypt3DES, encryptImage, decryptImage } from '../lib/crypto.js';
import { requireAuth } from '../middleware/auth.js';
import { fileTypeFromBuffer } from 'file-type'
import { performance } from 'perf_hooks';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

export default function (db) {
    const router = express.Router();

    const users = db.collection('users');
    const otps = db.collection('otps');
    const messages = db.collection('messages');

    router.post('/register', async (req, res) => {
        const { email } = req.body;
        const existing = await users.findOne({ email });
        if (!existing) {
            await users.insertOne({ email });
        }
        res.json({ success: true, user: { email } });
    });

    router.post('/request-otp', async (req, res) => {
        const { email } = req.body;
        const otp = generateOTP();

        await otps.deleteMany({ email });
        await otps.insertOne({ email, otp, createdAt: new Date() });

        await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP is ${otp}`,
        });

        res.json({ success: true, user: { email } });
    });

    router.post('/verify-otp', async (req, res) => {
        const { email, otp } = req.body;
        const record = await otps.findOne({ email, otp });

        if (!record) {
            return res.status(401).json({ success: false, message: 'Invalid OTP' });
        }

        await users.updateOne({ email }, { $set: { email } }, { upsert: true });
        await otps.deleteMany({ email });

        res.json({ success: true, user: { email } });
    });

    router.post('/chat/send', requireAuth, async (req, res) => {
        const { message } = req.body;
        const sender = req.user.email;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Missing message' });
        }

        const start = performance.now();
        const encrypted = encrypt3DES(message);
        const duration = performance.now() - start;

        try {
            await messages.insertOne({
                sender,
                message: encrypted,
                encryptDuration: parseFloat(duration),
                timestamp: new Date(),
            });

            const io = req.app.get('io');
            io.emit('newMessage');

            res.json({
                success: true,
                encryptDuration: parseFloat(duration),
            });
        } catch (err) {
            console.error("💥 Failed to save message:", err.message);
            res.status(500).json({
                success: false,
                message: 'Failed to send message',
                error: err.message,
            });
        }
    });


    router.post('/chat/decrypt', requireAuth, async (req, res) => {
        const { message } = req.body;
        const start = performance.now();

        if (!message) {
            return res.status(400).json({ success: false, message: 'Missing encrypted message' });
        }

        try {
            const decrypted = decrypt3DES(message);
            const duration = performance.now() - start;

            res.json({
                success: true,
                decrypted,
                duration: parseFloat(duration),
            });
        } catch (err) {
            console.error('🔐 Decrypt error:', err.message);
            res.status(500).json({ success: false, message: 'Failed to decrypt', error: err.message });
        }
    });


    router.post('/upload-image', requireAuth, async (req, res) => {
        const base64 = req.body.base64;
        const buffer = Buffer.from(base64, 'base64');

        const fileType = await fileTypeFromBuffer(buffer);
        if (!fileType || !fileType.mime.startsWith('image/')) {
            return res.status(400).json({ success: false, message: 'Invalid image type' });
        }

        const encrypted = encryptImage(buffer);

        await db.collection('images').insertOne({
            sender: req.user.email,
            image: encrypted,
            mime: fileType.mime,
            timestamp: new Date(),
        });

        res.json({ success: true });
    });

    router.get('/image/:id', requireAuth, async (req, res) => {
        const id = req.params.id;
        const doc = await db.collection('images').findOne({ _id: new ObjectId(id) });

        if (!doc) return res.status(404).send('Image not found');

        const decrypted = decryptImage(doc.image.buffer);
        res.set('Content-Type', 'image/jpeg');
        res.send(decrypted);
    });


    router.get('/chat/all', requireAuth, async (req, res) => {
        try {
            const userEmail = req.user?.email;
            if (!userEmail) {
                return res.status(401).json({ success: false, message: 'Unauthorized: Email tidak ditemukan' });
            }

            const textMessages = await db.collection('messages')
                .find({})
                .sort({ timestamp: 1 })
                .toArray();

            const mappedText = textMessages.map((msg) => ({
                sender: msg.sender,
                message: msg.message,
                timestamp: msg.timestamp,
                encryptDuration: msg.encryptDuration,
                type: 'text',
            }));

            res.json(mappedText);
        } catch (err) {
            console.error('❌ Gagal mengambil semua pesan:', err);
            res.status(500).json({ success: false, message: 'Gagal memuat pesan' });
        }
    });

    // router.get('/chat/image', async (_req, res) => {
    //     try {
    //         const allImages = await image.find({}).sort({ timestamp: 1 }).toArray()
    //         res.json(allImages)
    //     } catch (err) {
    //         console.error(err)
    //         res.status(500).json({ message: 'Gagal memuat gambar' })
    //     }
    // })


    return router;
}

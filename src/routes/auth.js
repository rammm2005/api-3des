import express from 'express';
import nodemailer from 'nodemailer';
import { generateOTP, encrypt3DES, decrypt3DES, encryptImage, decryptImage } from '../lib/crypto.js';
import { requireAuth } from '../middleware/auth.js';
import { fileTypeFromBuffer } from 'file-type'

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

        if (!message)
            return res.status(400).json({ success: false, message: 'Missing message' });

        const encrypted = encrypt3DES(message);
        await messages.insertOne({ sender, message: encrypted, timestamp: new Date() });

        const io = req.app.get('io');
        io.emit('newMessage');

        res.json({ success: true });
    });

    router.post('/chat/decrypt', requireAuth, async (req, res) => {
        const { message, type } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Missing encrypted message' });
        }

        try {
            let decrypted;
            let mime = null;

            if (type === 'image') {
                const buffer = Buffer.from(message, 'base64');
                const decryptedBuffer = decryptImage(buffer);

                if (!Buffer.isBuffer(decryptedBuffer)) {
                    throw new Error("Decryption result is not a buffer");
                }

                const fileType = await fileTypeFromBuffer(decryptedBuffer);
                mime = fileType?.mime || 'image/jpeg';

                decrypted = decryptedBuffer.toString('base64');
            } else {
                decrypted = decrypt3DES(message);
            }

            res.json({ success: true, decrypted, mime });
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


    router.get('/chat/all', requireAuth, async (_req, res) => {
        try {
            const textMessages = await db.collection('messages').find({}).toArray();

            const mappedText = textMessages.map((msg) => ({
                sender: msg.sender,
                message: msg.message,
                timestamp: msg.timestamp,
                type: 'text',
            }));

            mappedText.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            res.json(mappedText);
        } catch (err) {
            console.error('❌ Failed to fetch chat messages:', err);
            res.status(500).json({ success: false, message: 'Failed to load messages' });
        }
    });




    router.get('/chat/image', async (_req, res) => {
        try {
            const allImages = await image.find({}).sort({ timestamp: 1 }).toArray()
            res.json(allImages)
        } catch (err) {
            console.error(err)
            res.status(500).json({ message: 'Gagal memuat gambar' })
        }
    })


    return router;
}

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const key = Buffer.from(process.env.KEY_3DES, 'utf8'); // 24 byte
const iv = Buffer.from(process.env.IV_3DES, 'utf8');   // 8 byte

export function encrypt3DES(text) {
    console.time('Encrypt Time');
    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    console.timeEnd('Encrypt Time');
    return encrypted;
}

export function decrypt3DES(encryptedText) {
    console.time('Decrypt Time');
    const decipher = crypto.createDecipheriv('des-ede3-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    console.timeEnd('Decrypt Time');
    return decrypted;
}

export function encryptImage(buffer) {
    console.time('Encrypt Image Time');
    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    console.timeEnd('Encrypt Image Time');
    return encrypted;
}

export function decryptImage(encryptedBuffer) {
    console.time('Decrypt Image Time');
    const decipher = crypto.createDecipheriv('des-ede3-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    console.timeEnd('Decrypt Image Time');
    return decrypted;
}

export function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

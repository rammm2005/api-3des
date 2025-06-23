import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();


const key = Buffer.from(process.env.KEY_3DES, 'utf8'); // 24 byte
const iv = Buffer.from(process.env.IV_3DES, 'utf8'); // 8 byte 😄

export function encrypt3DES(text) {
    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

export function decrypt3DES(encryptedText) {
    const decipher = crypto.createDecipheriv('des-ede3-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export function decryptImage(encryptedBuffer) {
  const decipher = crypto.createDecipheriv('des-ede3-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted;
}

export function encryptImage(buffer) {
    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return encrypted;
}

export function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
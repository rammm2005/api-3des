import { MongoClient } from 'mongodb';

export async function connectToDatabase() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db('chatapp');
    return {
        db,
        users: db.collection('users'),
        messages: db.collection('messages'),
        otps: db.collection('otps'),
    };
}
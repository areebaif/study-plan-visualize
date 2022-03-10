import { MongoMemoryServer } from 'mongodb-memory-server';
import { Db, MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

import { app } from '../app';
import { connectDb, mongoDBClient } from '../services/mongodb';

let mongo: any;
let client: any;
let db: any;

jest.mock('../nats-wrapper');

declare global {
    function signin(): string[];
}

beforeAll(async () => {
    process.env.JWT_KEY = 'asdfasdf';
    mongo = await MongoMemoryServer.create();
    const mongoUri = mongo.getUri();
    client = await mongoDBClient(mongoUri);
    db = await connectDb(mongoUri);
});

beforeEach(async () => {
    jest.clearAllMocks();

    const collections = await db.collections();
    for (let collection of collections) {
        await collection.deleteMany({});
    }
});

afterAll(async () => {
    await client.close();
    await mongo.stop();
});

global.signin = () => {
    // Build a JWT payload.  { id, email }
    const payload = {
        id: '134hefbhbf',
        email: 'test@test.com'
    };

    // Create the JWT!
    const token = jwt.sign(payload, process.env.JWT_KEY!);

    // Build session Object. { jwt: MY_JWT }
    const session = { jwt: token };

    // Turn that session into JSON
    const sessionJSON = JSON.stringify(session);

    // Take JSON and encode it as base64
    const base64 = Buffer.from(sessionJSON).toString('base64');

    // return a string thats the cookie with the encoded data
    return [`express:sess=${base64}`];
};

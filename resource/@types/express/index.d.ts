import { MongoClient, Db } from 'mongodb';
import { UserPayload } from '../../src/middlewares/currentUser';

declare global {
    namespace Express {
        interface Request {
            currentUser?: UserPayload;
        }
    }
}

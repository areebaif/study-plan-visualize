import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { currentUser, UserPayload } from '@ai-common-modules/auth';

export interface BodyProps {
    id: ObjectId;
    name: string;
    currentUser?: UserPayload | undefined;
}

export interface CustomRequest<T> extends Request {
    body: T;
}

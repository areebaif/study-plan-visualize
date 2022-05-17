import { Request } from 'express';

export interface BodyProps {
    id: string;
    name: string;
}

export interface CustomRequest<T> extends Request {
    body: T;
}

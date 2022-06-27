import { Request } from 'express';
import { UserPayload } from '@ai-common-modules/auth';

export interface AddResource {
    id?: string;
    name: string;
    type: string | undefined;
    learningStatus: number;
    version: number;
    description?: string;
    skillId?: {
        _id: string;
        userId: string;
        name: string;
        resourceId: string[];
        version: number;
    }[];
    currentUser?: UserPayload | undefined;
}

export interface CustomRequest<T> extends Request {
    body: T;
}

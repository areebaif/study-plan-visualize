import {
    DeleteResult,
    InsertOneResult,
    ObjectId,
    UpdateResult,
    WithId
} from 'mongodb';

import { connectDb } from '../services/mongodb';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

interface returnResourceDocument {
    _id: ObjectId;
    name?: string;
    type?: string;
    learningStatus?: number;
    version?: number;
    description?: string;
    skillId?: ObjectId[];
}
interface insertResourceDocument {
    _id?: ObjectId;
    name: string;
    type: string;
    learningStatus: number;
    version: number;
    description?: string;
    skillId?: ObjectId[];
}

export class Resource {
    static async insertResource(ResourceProps: insertResourceDocument) {
        try {
            const db = await connectDb();
            const { acknowledged, insertedId }: InsertOneResult = await db
                .collection('resource')
                .insertOne(ResourceProps);
            if (!acknowledged)
                throw new DatabaseErrors('unable to insert resource ');
            const resourceCreated = await Resource.getResourceById(insertedId);
            return resourceCreated;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to create resource in database either name in use or database operation failed'
            );
        }
    }

    static async getResourceById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: WithId<returnResourceDocument>[] = await db
                .collection('resource')
                .find({ _id })
                .toArray();
            if (!result.length)
                throw new DatabaseErrors(
                    'Unable to retrieve resource from database'
                );
            const document = result[0];
            return document;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve resource from database'
            );
        }
    }

    static async deleteResourceById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: DeleteResult = await db
                .collection('resource')
                .deleteOne({ _id });
            return result.deletedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming from database'
            );
        }
    }

    static async updateResource(updateProps: {
        _id: ObjectId;
        name: string;
        type?: string;
        description?: string;
        learningStatus: number;
        version: number;
        skillId?: ObjectId[] | undefined;
    }) {
        try {
            const db = await connectDb();
            const {
                _id,
                name,
                type,
                description,
                learningStatus,
                version,
                skillId
            } = updateProps;

            const result: UpdateResult = await db
                .collection('resource')
                .updateOne(
                    { _id },
                    {
                        $set: {
                            name: name,
                            type: type,
                            description: description,
                            learningStatus: learningStatus,
                            version: version,
                            skillId: skillId
                        }
                    }
                );
            return result.modifiedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to update resource in database');
        }
    }

    static async getResourceByIdAndVersion(_id: ObjectId, version: number) {
        try {
            const db = await connectDb();
            const result: WithId<returnResourceDocument>[] = await db
                .collection('resource')
                .find({ $and: [{ _id: _id }, { version: version }] })
                .toArray();
            if (!result.length)
                throw new DatabaseErrors(
                    'Unable to retrieve skill from database'
                );
            const document = result[0];
            return document;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'No such document exist with id and version'
            );
        }
    }
}

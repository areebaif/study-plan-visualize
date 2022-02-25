import {
    DeleteResult,
    InsertOneResult,
    ObjectId,
    UpdateResult,
    WithId
} from 'mongodb';
import { resourceActiveStatus } from '@ai-common-modules/events';
import { connectDb } from '../services/mongodb';

import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

interface returnResourceDocument {
    _id?: ObjectId;
    userId?: ObjectId;
    name?: string;
    type?: string | undefined;
    learningStatus?: number;
    version?: number;
    description?: string;
    skillId?: ObjectId[];
    dbStatus?: resourceActiveStatus;
}

interface insertResourceDocument {
    _id?: ObjectId;
    userId: ObjectId;
    name: string;
    type: string | undefined;
    learningStatus: number;
    version: number;
    description?: string;
    skillId?: ObjectId[];
    dbStatus: resourceActiveStatus;
}

export class Resource {
    static collectionName = 'resource';

    static async insertResource(ResourceProps: insertResourceDocument) {
        try {
            const db = await connectDb();
            const { acknowledged, insertedId }: InsertOneResult = await db
                .collection(Resource.collectionName)
                .insertOne(ResourceProps);
            if (!acknowledged)
                throw new DatabaseErrors('unable to insert resource ');
            const resourceCreated = await Resource.resourceById(insertedId);
            return resourceCreated;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to create resource in database either name in use or database operation failed'
            );
        }
    }

    static async resourceById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: WithId<returnResourceDocument>[] = await db
                .collection(Resource.collectionName)
                .find({ _id })
                .toArray();
            if (!result)
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

    static async resourceByNameAndUserId(
        name: string,
        userId: ObjectId,
        dbStatus: resourceActiveStatus
    ) {
        try {
            const db = await connectDb();
            const result: WithId<returnResourceDocument>[] = await db
                .collection(Resource.collectionName)
                .find({ name, userId, dbStatus })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve resource from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve resource from database'
            );
        }
    }

    static async getAllResourceByUserId(
        userId: ObjectId,
        dbStatus: resourceActiveStatus
    ) {
        try {
            const db = await connectDb();
            const result: WithId<returnResourceDocument>[] = await db
                .collection(Resource.collectionName)
                // you only want to return documents that are active in database
                .find({ userId, dbStatus })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve resource from database'
                );
            return result;
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
            const result = await db
                .collection(Resource.collectionName)
                .updateOne(
                    { _id },
                    {
                        $set: {
                            dbStatus: resourceActiveStatus.inactive
                        }
                    }
                );
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming from database'
            );
        }
    }

    static async getResourceByUserIdAndName(userId: ObjectId, name: string) {
        try {
            const db = await connectDb();
            const result: WithId<returnResourceDocument>[] = await db
                .collection(Resource.collectionName)
                // you only want to return user password in case you are doing a password check
                .find({ $and: [{ userId: userId }, { name: name }] })
                .toArray();
            if (!result.length)
                throw new DatabaseErrors(
                    'Unable to retrieve programming language from database'
                );
            const document = result[0];
            return document;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming language from database'
            );
        }
    }
    static async updateResource(updateProps: {
        _id: ObjectId;
        userId: ObjectId;
        name: string;
        type: string | undefined;
        learningStatus: number;
        version: number;
        description?: string;
        skillId?: ObjectId[];
    }) {
        try {
            const db = await connectDb();
            const {
                _id,
                userId,
                name,
                type,
                learningStatus,
                version,
                description,
                skillId
            } = updateProps;
            const existingVersion = await Resource.getResourceByIdAndVersion(
                _id,
                version - 1
            );
            if (!existingVersion)
                throw new DatabaseErrors(
                    'we cannot update since the version of the record is not correct'
                );

            const result: UpdateResult = await db
                .collection(Resource.collectionName)
                .updateOne(
                    { _id },
                    {
                        $set: {
                            name: name,
                            userId: userId,
                            type: type,
                            learningStatus: learningStatus,
                            version: version,
                            description: description,
                            skillId: skillId
                        }
                    }
                );
            return result.modifiedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to update resource in database wither document version incorrect or update operation failed'
            );
        }
    }

    static async getResourceByIdAndVersion(_id: ObjectId, version: number) {
        try {
            const db = await connectDb();
            const result: WithId<returnResourceDocument>[] = await db
                .collection(Resource.collectionName)
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

    static async updateResourceRemoveSkillId(
        _id: ObjectId,
        version: number,
        skillId: ObjectId[]
    ) {
        try {
            const db = await connectDb();
            const existingVersion = await Resource.getResourceByIdAndVersion(
                _id,
                version - 1
            );
            if (!existingVersion)
                throw new DatabaseErrors(
                    'we cannot update since the version of the record is not correct'
                );

            const result: UpdateResult = await db
                .collection(Resource.collectionName)
                .updateOne(
                    { _id },
                    { $pullAll: { skillId: skillId }, $set: { version } }
                );
            return result.modifiedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to update resource in database wither document version incorrect or update operation failed'
            );
        }
    }
}

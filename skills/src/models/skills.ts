import { InsertOneResult, ObjectId, UpdateResult, WithId } from 'mongodb';
import { skillActiveStatus } from '@ai-common-modules/events';
import { connectDb } from '../services/mongodb';

import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

export interface returnSkillDocument {
    _id?: ObjectId;
    userId?: ObjectId;
    name?: string;
    version?: number;
    resourceId?: ObjectId[] | undefined;
    dbStatus?: skillActiveStatus;
}

export interface insertSkillDocument {
    _id?: ObjectId;
    userId: ObjectId;
    name: string;
    version: number;
    resourceId?: ObjectId[] | undefined;
    dbStatus?: skillActiveStatus;
}

export class Skills {
    static collectionName = 'skills';
    static async insertSkill(skillProps: insertSkillDocument) {
        try {
            const db = await connectDb();
            const { acknowledged, insertedId }: InsertOneResult = await db
                .collection(Skills.collectionName)
                .insertOne(skillProps);
            if (!acknowledged)
                throw new DatabaseErrors('unable to insert skill ');
            const skillCreated = await Skills.getSkillById(insertedId);
            return skillCreated;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to create user in database either email in use or database operation failed'
            );
        }
    }

    static async getSkillByNameAndUserId(
        name: string,
        dbStatus: skillActiveStatus,
        userId: ObjectId
    ): Promise<returnSkillDocument[] | undefined> {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection(Skills.collectionName)
                .find({ name, dbStatus, userId })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve skill from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async getAllSkillsbyUserId(
        userId: ObjectId,
        dbStatus: skillActiveStatus
    ): Promise<returnSkillDocument[] | undefined> {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection(Skills.collectionName)
                .find({ userId, dbStatus })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve skill from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async getSkillById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection(Skills.collectionName)
                // you only want to return user password in case you are doing a password check
                .find({ _id })
                .toArray();
            if (!result.length)
                throw new DatabaseErrors(
                    'Unable to retrieve skill from database'
                );
            const document = result[0];
            return document;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }
    static async findSkillByIdAndVersion(_id: ObjectId, version: number) {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection(Skills.collectionName)
                // you only want to return user password in case you are doing a password check
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
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async deleteSkillById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result = await db
                .collection(Skills.collectionName)
                /// when we delete we dont remove database entry we just change the status to inactive
                .updateOne(
                    { _id },
                    {
                        $set: {
                            dbStatus: skillActiveStatus.inactive
                        }
                    }
                );
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async addResource(updateProps: {
        _id: ObjectId;
        version: number;
        resourceId: ObjectId[] | undefined;
    }) {
        try {
            const db = await connectDb();
            const { _id, version, resourceId } = updateProps;
            // check that we are at right version and then only update
            const existingVersion = await Skills.findSkillByIdAndVersion(
                _id,
                version - 1
            );
            if (!existingVersion)
                throw new DatabaseErrors(
                    'we cannot update since the version of the record is not correct'
                );
            const result: UpdateResult = await db
                .collection(Skills.collectionName)
                .updateOne(
                    { _id },
                    {
                        $set: {
                            version: version
                        },
                        $addToSet: { resourceId: { $each: resourceId } }
                    }
                );
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to add resource to database either record version incorrect or something has gone wrong'
            );
        }
    }

    static async removeResource(updateProps: {
        _id: ObjectId;
        version: number;
        resourceId: ObjectId[] | undefined;
    }) {
        try {
            const db = await connectDb();
            const { _id, version, resourceId } = updateProps;
            // check that we are at right version and then only update
            const existingVersion = await Skills.findSkillByIdAndVersion(
                _id,
                version - 1
            );
            if (!existingVersion)
                throw new DatabaseErrors(
                    'we cannot update since the version of the record is not correct'
                );
            const result: UpdateResult = await db
                .collection(Skills.collectionName)
                .updateOne(
                    { _id },
                    {
                        $set: {
                            version: version
                        },
                        $pullAll: { resourceId: resourceId }
                    }
                );
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to remove resource either version number not correct or something has gone wrong'
            );
        }
    }

    static async updateSkillName(updateProps: {
        _id: ObjectId;
        name: string;
        version: number;
        userId: ObjectId;
    }) {
        try {
            const { _id, name, version, userId } = updateProps;
            const db = await connectDb();
            // check that we are at right version and then only update
            const existingVersion = await Skills.findSkillByIdAndVersion(
                _id,
                version - 1
            );
            if (!existingVersion)
                throw new DatabaseErrors(
                    'we cannot update since the version of the record is not correct'
                );
            const result: UpdateResult = await db
                .collection(Skills.collectionName)
                .updateOne(
                    { _id, userId },
                    { $set: { name: name, version: version } }
                );
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'updating failed either version number not correct or something has gone wrong while updating'
            );
        }
    }
}

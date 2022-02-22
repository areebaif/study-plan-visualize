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

export enum databaseStatus {
    active = 'active',
    inactive = 'inactive'
}

export interface returnSkillDocument {
    _id: ObjectId;
    userId?: ObjectId;
    name?: string;
    course?: ObjectId;
    book?: ObjectId;
    version?: number;
    dbStatus?: databaseStatus;
}

export interface insertSkillDocument {
    _id?: ObjectId;
    userId: ObjectId;
    name: string;
    course?: ObjectId;
    book?: ObjectId;
    version: number;
    dbStatus?: databaseStatus;
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

    static async getSkillByName(
        name: string,
        dbStatus: databaseStatus,
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
        dbStatus: databaseStatus
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
                            dbStatus: databaseStatus.inactive
                        }
                    }
                );
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async updateSkillByCourse(updateProps: {
        _id: ObjectId;
        version: number;
        course: ObjectId | undefined;
    }) {
        try {
            const db = await connectDb();
            const { _id, version, course } = updateProps;
            const result: UpdateResult = await db
                .collection(Skills.collectionName)
                .updateOne(
                    { _id },
                    {
                        $set: {
                            version: version,
                            course: course
                        }
                    }
                );
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async updateSkillByBook(updateProps: {
        _id: ObjectId;
        version: number;
        book: ObjectId | undefined;
    }) {
        try {
            const db = await connectDb();
            const { _id, version, book } = updateProps;
            const result: UpdateResult = await db
                .collection(Skills.collectionName)
                .updateOne(
                    { _id },
                    {
                        $set: {
                            version: version,
                            book: book
                        }
                    }
                );
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
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
            // check that we are at right ersion and then only update
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

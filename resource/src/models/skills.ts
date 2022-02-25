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

interface returnSkillDocument {
    _id?: ObjectId;
    userId?: ObjectId;
    name?: string;
    version?: number;
    resourceId?: ObjectId[] | undefined;
}

interface insertSkillDocument {
    _id: ObjectId;
    userId: ObjectId;
    name: string;
    version: number;
    resourceId?: ObjectId[] | undefined;
}

export class Skills {
    static collectionName = 'skill';
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

    static async getSkillById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection(Skills.collectionName)
                .find({ _id })
                .toArray();
            if (!result.length)
                throw new DatabaseErrors(
                    'Unable to retrieve skill from database'
                );
            return result;
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

    static async findSkillByUserIdAndName(userId: ObjectId, name: string) {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection(Skills.collectionName)
                // you only want to return user password in case you are doing a password check
                .find({ $and: [{ userId: userId }, { name: name }] })
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
            const result: DeleteResult = await db
                .collection(Skills.collectionName)
                .deleteOne({ _id });
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }
    static async updateSkill(updateProps: {
        _id: ObjectId;
        name: string;
        version: number;
        resourceId?: ObjectId[] | undefined;
    }) {
        try {
            const db = await connectDb();
            const { _id, name, version, resourceId } = updateProps;

            const result: UpdateResult = await db
                .collection(Skills.collectionName)
                .updateOne(
                    { _id },
                    {
                        $set: {
                            name: name,
                            version: version,
                            resourceId: resourceId
                        }
                    }
                );
            return result.modifiedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }
}

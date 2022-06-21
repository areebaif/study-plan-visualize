import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';
import { natsWrapper } from '../nats-wrapper';
import jwt from 'jsonwebtoken';
import { skillActiveStatus } from '@ai-common-modules/events';
import { currentUser } from '../middlewares/currentUser';
import {
    skillCreatedPublisher,
    skillDeletedPublisher,
    skillUpdatedPublisher
} from '../events/publishers';
import { BodyProps, CustomRequest } from '../types/interfaceRequest';
import { Skills } from '../models/skills';
import { BadRequestError } from '../errors/badRequestError';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';
import { NotAuthorizedError } from '../errors/notAuthroizedError';
import { Resource } from '../models/resource';

const router = express.Router();

// router.get(
//     '/api/skills/learning',
//     async (
//         req: CustomRequest<BodyProps>,
//         res: Response,
//         next: NextFunction
//     ) => {
//         try {
//             const { id, name, currentUser } = req.body;
//             if (!id || !name || !currentUser)
//                 throw new BadRequestError(
//                     'please provide id and name or user not authenticated'
//                 );
//             const _id = new ObjectId(id);

//             const skill = await Skills.getSkillById(_id);
//             if (!skill)
//                 throw new BadRequestError(
//                     'cannot find skill with the required id'
//                 );
//             const { course, book } = skill;
//             let courseStatus = 0;
//             let bookStatus = 0;
//             if (course) {
//                 // TODO: update these you will need to do loops and arrays
//                 const courseDocument = await Course.getCourseById(course);
//                 const { learningStatus } = courseDocument;
//                 courseStatus = learningStatus ? learningStatus : 0;
//             }
//             if (book) {
//                 const bookDocument = await Book.getBookById(book);
//                 const { learningStatus } = bookDocument;
//                 bookStatus = learningStatus ? learningStatus : 0;
//             }
//             let result: number;
//             if (courseStatus && bookStatus) {
//                 result = courseStatus * 0.5 + bookStatus * 0.5;
//             } else if (courseStatus && !bookStatus) {
//                 result = courseStatus;
//             } else if (bookStatus && !courseStatus) {
//                 result = bookStatus;
//             } else {
//                 result = 0;
//             }
//             res.status(200).send({ data: result });
//         } catch (err) {
//             logErrorMessage(err);
//             next(err);
//         }
//     }
// );
interface UserPayload {
    id: string;
    email: string;
}
// create
router.post(
    '/api/skills/add',
    currentUser,
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            console.log('I am here add');
            const { name } = req.body;
            const { currentUser } = req;
            if (!currentUser) throw new NotAuthorizedError('not authorized');
            if (!name)
                throw new BadRequestError(
                    'user not authorized or skill name not provided'
                );
            const dbStatus = skillActiveStatus.active;
            const userId = new ObjectId(currentUser.id);
            // check if active entries in the db already have skill with this name
            const existingSkill = await Skills.getSkillByNameAndUserId(
                name,
                dbStatus,
                userId
            );
            if (existingSkill?.length) {
                throw new BadRequestError('skill name already in use');
            }
            // first time default version to 1
            const version = 1;
            const resourceId: ObjectId[] = [];
            const skillDoc = await Skills.insertSkill({
                userId,
                name,
                version,
                dbStatus,
                resourceId
            });
            if (!skillDoc) throw new DatabaseErrors('unable to create skill');
            if (
                !skillDoc.name ||
                !skillDoc.version ||
                !skillDoc.userId ||
                !skillDoc.dbStatus
            )
                throw new Error(
                    'skill name, version and userId needed to publish skill:created event'
                );
            const userToJSON = userId.toJSON();
            // check of skillDoc.resourceId exits. convert every value of resource id to JSON
            const resourceToJSON = skillDoc.resourceId?.length
                ? skillDoc.resourceId.map((id) => {
                      return id.toJSON();
                  })
                : undefined;
            // publish skillCreatedEvent
            await new skillCreatedPublisher(natsWrapper.client).publish({
                _id: skillDoc._id.toString(),
                userId: userToJSON,
                name: skillDoc.name,
                version: skillDoc.version,
                resourceId: resourceToJSON,
                dbStatus: skillDoc.dbStatus
            });
            res.status(201).send({ data: [skillDoc] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// get all skills
router.get(
    '/api/skills/all',
    currentUser,
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { currentUser } = req;
            if (!currentUser) throw new NotAuthorizedError('not authorized');
            const userId = new ObjectId(currentUser.id);
            const skills = await Skills.getAllSkillsbyUserId(
                userId,
                skillActiveStatus.active
            );
            const mappedResult = skills.map(async (element) => {
                if (element.resourceId?.length) {
                    const mappedResource = element.resourceId.map((id) => {
                        return Resource.getResourceById(id);
                    });
                    const resolvedValues = await Promise.all(mappedResource);
                    return {
                        _id: element._id,
                        userId: element.userId,
                        name: element.name,
                        version: element.version,
                        resourceId: resolvedValues,
                        dbStatus: element.dbStatus
                    };
                }
                return element;
            });
            const result = await Promise.all(mappedResult);
            res.status(200).send({ data: result });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// get all skills with reour eiD and name

router.get(
    '/api/skills/:id',
    currentUser,
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            console.log('I am here update id');
            const { id } = req.params;
            const { currentUser } = req;
            if (!currentUser) throw new NotAuthorizedError('not authorized');
            const _id = new ObjectId(id);
            const skill = await Skills.getSkillById(_id);
            res.status(200).send({ data: [skill] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// delete skills
router.post(
    '/api/skills/destroy',
    currentUser,
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id } = req.body;
            const { currentUser } = req;
            if (!currentUser) throw new NotAuthorizedError('not authorized');
            if (!id)
                throw new BadRequestError('please provide id to delete skill');
            const userId = new ObjectId(currentUser.id);
            const _id = new ObjectId(id);

            const skill = await Skills.getSkillById(_id);
            if (!skill)
                throw new Error('cannot find skill with the required id');

            const skillDeleted = await Skills.deleteSkillById(_id);

            // publish event
            if (skillDeleted) {
                if (
                    !skill.version ||
                    !skill.name ||
                    !skill.userId ||
                    !skill.dbStatus
                )
                    throw new Error(
                        'version dbStatus and name are needed to update record'
                    );
                const userToJSON = userId.toJSON();
                const resourceToJSON = skill.resourceId?.length
                    ? skill.resourceId.map((id) => {
                          return id.toJSON();
                      })
                    : undefined;

                await new skillDeletedPublisher(natsWrapper.client).publish({
                    _id: skill._id.toString(),
                    userId: userToJSON,
                    name: skill.name,
                    version: skill.version,
                    resourceId: resourceToJSON,
                    dbStatus: skill.dbStatus
                });
            }
            res.status(202).send({ data: skillDeleted });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.post(
    '/api/skills/update',
    currentUser,
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            console.log('I am here update');
            const { id, name } = req.body;
            const { currentUser } = req;
            if (!currentUser) throw new NotAuthorizedError('not authorized');
            if (!id || !name)
                throw new BadRequestError(
                    'please provide id and name to update skill'
                );
            const userId = new ObjectId(currentUser.id);
            const dbStatus = skillActiveStatus.active;
            const existingSkill = await Skills.getSkillByNameAndUserId(
                name,
                dbStatus,
                userId
            );
            if (existingSkill?.length) {
                throw new BadRequestError(
                    'The skill name you are trying to update is already in use please provide new name'
                );
            }
            const _id = new ObjectId(id);
            const skill = await Skills.getSkillById(_id);
            if (!skill)
                throw new BadRequestError(
                    'cannot find skill with the required id'
                );
            if (!skill.version || !skill.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );
            const newVersion = skill.version + 1;
            const updateSkill = await Skills.updateSkillName({
                _id,
                name,
                version: newVersion,
                userId
            });
            if (!updateSkill) throw new Error('unable to update skill by name');

            const skillDoc = await Skills.findSkillByIdAndVersion(
                _id,
                newVersion
            );
            if (skillDoc) {
                if (
                    !skillDoc.version ||
                    !skillDoc.name ||
                    !skill.userId ||
                    !skill.dbStatus
                )
                    throw new Error(
                        'we need skill database doc details to publish this event'
                    );
                const userToJSON = skill.userId.toJSON();
                const resourceToJSON = skillDoc.resourceId?.length
                    ? skillDoc.resourceId.map((id) => {
                          return id.toJSON();
                      })
                    : undefined;
                await new skillUpdatedPublisher(natsWrapper.client).publish({
                    _id: skillDoc._id.toString(),
                    userId: userToJSON,
                    name: skillDoc.name,
                    version: skillDoc.version,
                    resourceId: resourceToJSON,
                    dbStatus: skill.dbStatus
                });
            }

            res.status(200).send({ data: [skillDoc] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

export { router as skillRouter };

import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';
import { natsWrapper } from '../nats-wrapper';
import {
    skillCreatedPublisher,
    skillDeletedPublisher,
    skillUpdatedPublisher
} from '../events/publishers';
import { BodyProps, CustomRequest } from '../types/interfaceRequest';
import { databaseStatus, Skills } from '../models/skills';
import { BadRequestError } from '../errors/badRequestError';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';
import { Course } from '../models/course';
import { Book } from '../models/book';

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

// create
router.post(
    '/api/skills/add',
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            // we need name, version, dbStatus
            const { name, currentUser } = req.body;
            if (!name || !currentUser)
                throw new BadRequestError('please provide name for skill');
            const dbStatus = databaseStatus.active;
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
            const skillDoc = await Skills.insertSkill({
                userId,
                name,
                version,
                dbStatus
            });
            if (!skillDoc) throw new DatabaseErrors('unable to create skill');
            if (!skillDoc.name || !skillDoc.version || !skillDoc.userId)
                throw new Error(
                    'we need skill name to publish skill:created event'
                );
            const userToJSON = userId.toJSON();
            // check of skillDoc.course exits. convert every value of course id to JSON
            const courseToJSON = skillDoc.course?.length
                ? skillDoc.course.map((id) => {
                      return id.toJSON();
                  })
                : undefined;
            const bookToJSON = skillDoc.book
                ? skillDoc.book.toJSON()
                : undefined;
            // publish skillCreatedEvent
            await new skillCreatedPublisher(natsWrapper.client).publish({
                _id: skillDoc._id.toString(),
                userId: userToJSON,
                name: skillDoc.name,
                version: skillDoc.version,
                course: courseToJSON,
                book: bookToJSON
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
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { currentUser } = req.body;
            if (!currentUser) throw new BadRequestError('user not loggedIn');
            const userId = new ObjectId(currentUser.id);
            const skills = await Skills.getAllSkillsbyUserId(
                userId,
                databaseStatus.active
            );
            res.status(200).send({ data: skills });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.get(
    '/api/skills/:id',
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id } = req.params;
            const { currentUser } = req.body;
            if (!currentUser) throw new BadRequestError('user not loggedIn');
            const _id = new ObjectId(id);
            const skill = await Skills.getSkillById(_id);
            res.status(200).send({ data: skill });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// delete skills
router.post(
    '/api/skills/destroy',
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id, currentUser } = req.body;
            if (!id || !currentUser)
                throw new BadRequestError(
                    'please provide id to delete skill or user not authorised'
                );
            const userId = new ObjectId(currentUser.id);
            const _id = new ObjectId(id);

            const skill = await Skills.getSkillById(_id);
            if (!skill)
                throw new Error('cannot find skill with the required id');

            const skillDeleted = await Skills.deleteSkillById(_id);

            // publish event
            if (skillDeleted) {
                if (!skill.version || !skill.name || !skill.userId)
                    throw new Error(
                        'version dbStatus and name are needed to update record'
                    );
                const userToJSON = userId.toJSON();
                const courseToJSON = skill.course?.length
                    ? skill.course.map((id) => {
                          return id.toJSON();
                      })
                    : undefined;
                const bookToJSON = skill.book ? skill.book.toJSON() : undefined;

                await new skillDeletedPublisher(natsWrapper.client).publish({
                    _id: skill._id.toString(),
                    userId: userToJSON,
                    name: skill.name,
                    version: skill.version,
                    course: courseToJSON,
                    book: bookToJSON
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
    async (
        req: CustomRequest<BodyProps>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id, name, currentUser } = req.body;
            if (!id || !name || !currentUser)
                throw new BadRequestError(
                    'please provide id and name to update skill'
                );
            const userId = new ObjectId(currentUser.id);
            const dbStatus = databaseStatus.active;
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
                if (!skillDoc.version || !skillDoc.name || !skill.userId)
                    throw new Error(
                        'we need skill database doc details to publish this event'
                    );
                const userToJSON = skill.userId.toJSON();
                const courseToJSON = skillDoc.course?.length
                    ? skillDoc.course.map((id) => {
                          return id.toJSON();
                      })
                    : undefined;
                const bookToJSON = skillDoc.book
                    ? skillDoc.book.toJSON()
                    : undefined;
                await new skillUpdatedPublisher(natsWrapper.client).publish({
                    _id: skillDoc._id.toString(),
                    userId: userToJSON,
                    name: skillDoc.name,
                    version: skillDoc.version,
                    course: courseToJSON,
                    book: bookToJSON
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

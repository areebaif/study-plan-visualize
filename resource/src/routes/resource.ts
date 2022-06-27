import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';
import { natsWrapper } from '../../nats-wrapper';
import { currentUser } from '../middlewares/currentUser';

import { CustomRequest, AddResource } from '../types/interfaceRequest';
import {
    ResourceCreatedPublisher,
    ResourceDeletedPublisher,
    ResourceUpdatedPublisher
} from '../events/publishers';
import { BadRequestError } from '../errors/badRequestError';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';
import { Skills } from '../models/skills';
import { Resource } from '../models/resource';
import { resourceActiveStatus } from '@ai-common-modules/events';

const router = express.Router();

router.post(
    '/api/resource/add',
    currentUser,
    async (
        req: CustomRequest<AddResource>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { name, type, learningStatus, description, skillId } =
                req.body;
            const { currentUser } = req;
            if (!name || !type || !learningStatus || !currentUser)
                throw new BadRequestError(
                    'either user not authorised or resource name, type or learning status not provided'
                );
            if (learningStatus < 0 || learningStatus > 100)
                throw new BadRequestError(
                    'learnning status must be between 0 and 100'
                );

            // define variables to insert in db
            const userId = new ObjectId(currentUser.id);
            const version = 1;
            const dbStatus = resourceActiveStatus.active;
            const skillsArray = skillId?.map((element) => element._id);
            let skills: ObjectId[] | undefined;

            // check if resourceName already exists in database
            const existingResource = await Resource.getResourceByUserIdAndName(
                userId,
                name
            );
            if (existingResource)
                throw new DatabaseErrors('resource name already in use');
            //check if skillId supplied by user exist in database
            if (skillsArray) {
                const promiseSkillArray = skillsArray.map((id) => {
                    const parsedId = new ObjectId(id);
                    return Skills.getSkillById(parsedId);
                });

                const allSkills = await Promise.all(promiseSkillArray);
                console.log('after skill');

                // map and only keep ids to store in resource database
                skills = allSkills.map((skill) => {
                    return skill._id;
                });
            }

            const resourceDoc = await Resource.insertResource({
                name,
                userId,
                type,
                learningStatus,
                version,
                description,
                skillId: skills,
                dbStatus: dbStatus
            });

            if (!resourceDoc)
                throw new DatabaseErrors('unable to create resource');

            // publish the event
            if (
                !resourceDoc.name ||
                !resourceDoc.userId ||
                !resourceDoc.version ||
                !resourceDoc.learningStatus ||
                !resourceDoc.type
            )
                throw new Error(
                    'name, userId, version, learningStatus, type are required field for publishng resource creation event'
                );
            const skillJSON = resourceDoc.skillId?.map((id) => {
                return id.toJSON();
            });
            await new ResourceCreatedPublisher(natsWrapper.client).publish({
                _id: resourceDoc._id.toString(),
                userId: resourceDoc.userId.toJSON(),
                name: resourceDoc.name,
                version: resourceDoc.version,
                learningStatus: resourceDoc.learningStatus,
                type: resourceDoc.type,
                skillId: skillJSON,
                description: resourceDoc.description,
                dbStatus: resourceDoc.dbStatus
            });
            res.status(201).send({ data: [resourceDoc] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.get(
    '/api/resource/all',
    currentUser,
    async (
        req: CustomRequest<AddResource>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { currentUser } = req;
            if (!currentUser) throw new BadRequestError('user not authroised');
            const userId = new ObjectId(currentUser.id);
            const dbStatus = resourceActiveStatus.active;
            const resource = await Resource.getAllResourceByUserId(
                userId,
                dbStatus
            );
            const mappedResult = resource.map(async (element) => {
                if (element.skillId?.length) {
                    const mappedResource = element.skillId.map((id) => {
                        return Skills.getSkillById(id);
                    });
                    const resolvedValues = await Promise.all(mappedResource);
                    return {
                        _id: element._id,
                        userId: element.userId,
                        name: element.name,
                        type: element.type,
                        learningStatus: element.learningStatus,
                        version: element.version,
                        description: element.description,
                        skillId: resolvedValues,
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

router.get(
    '/api/resource/:id',
    currentUser,
    async (
        req: CustomRequest<AddResource>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id } = req.params;
            const { currentUser } = req;
            if (!currentUser) throw new BadRequestError('user not authroised');
            const _id = new ObjectId(id);
            const resource = await Resource.resourceById(_id);
            res.status(200).send({ data: [resource] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// delete
router.post(
    '/api/resource/destroy',
    currentUser,
    async (
        req: CustomRequest<AddResource>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id } = req.body;
            const { currentUser } = req;
            if (!id || !currentUser)
                throw new BadRequestError(
                    'either user not authorised or no id provided to delete resource'
                );
            const _id = new ObjectId(id);

            // find the resource with id in database
            const resource = await Resource.resourceById(_id);
            if (!resource)
                throw new BadRequestError(
                    'cannot find resource with the required id'
                );
            const resourceDeleted = await Resource.deleteResourceById(_id);

            // publish event
            if (resourceDeleted) {
                if (
                    !resource.name ||
                    !resource.userId ||
                    !resource.version ||
                    !resource.learningStatus ||
                    !resource.type
                )
                    throw new Error(
                        'name, userId, version, learningStatus, type are required field for publishng resource creation event'
                    );

                const skillJSON = resource.skillId?.map((id) => {
                    return id.toJSON();
                });

                await new ResourceDeletedPublisher(natsWrapper.client).publish({
                    _id: resource._id.toString(),
                    userId: resource.userId.toJSON(),
                    name: resource.name,
                    version: resource.version,
                    learningStatus: resource.learningStatus,
                    type: resource.type,
                    skillId: skillJSON,
                    description: resource.description,
                    dbStatus: resource.dbStatus
                });
            }
            res.status(201).send({ data: resourceDeleted });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// update resource
router.post(
    '/api/resource/update',
    currentUser,
    async (
        req: CustomRequest<AddResource>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id, name, type, learningStatus, description, skillId } =
                req.body;
            const { currentUser } = req;
            if (!name || !type || !learningStatus || !currentUser || !id)
                throw new BadRequestError(
                    'either user not authorised or resource name, type or learning status not provided'
                );

            if (learningStatus < 0 || learningStatus > 100)
                throw new BadRequestError(
                    'learnning status must be between 0 and 100'
                );
            const parsedId = new ObjectId(id);
            // check if resource exists in database
            const resourceDoc = await Resource.resourceById(parsedId);
            if (!resourceDoc)
                throw new BadRequestError(
                    'resource does not exist with name and id'
                );
            if (!resourceDoc.version || !resourceDoc.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );
            // define variables to update resource
            const skillsArray = skillId?.map((element) => element._id);
            const newVersion = resourceDoc.version + 1;
            let newSkillId: ObjectId[] | undefined;

            //check if skillId and name supplied by user exist in database
            if (skillsArray) {
                const promiseSkillArray = skillsArray.map((id) => {
                    const parsedId = new ObjectId(id);
                    return Skills.getSkillById(parsedId);
                });

                const allSkills = await Promise.all(promiseSkillArray);

                // map and only keep ids to store in cpurse database
                newSkillId = allSkills.map((skill) => {
                    return skill._id;
                });
            }

            // update resource database
            const resourceUpdated = await Resource.updateResource({
                _id: parsedId,
                name,
                type,
                learningStatus,
                version: newVersion,
                description,
                skillId: newSkillId
            });
            if (!resourceUpdated) {
                throw new DatabaseErrors('failed to update resource');
            }
            // find updated resource to publish event and send to front-end
            const updatedResource = await Resource.getResourceByIdAndVersion(
                parsedId,
                newVersion
            );
            if (!updatedResource)
                throw new DatabaseErrors('unable to update resource');

            // publish the event
            if (
                !updatedResource.name ||
                !updatedResource.userId ||
                !updatedResource.version ||
                !updatedResource.learningStatus ||
                !updatedResource.type
            )
                throw new Error(
                    'name, userId, version, learningStatus, type are required field for publishng resource creation event'
                );

            const skillJSON = updatedResource.skillId?.map((id) => {
                return id.toJSON();
            });

            await new ResourceUpdatedPublisher(natsWrapper.client).publish({
                _id: updatedResource._id.toString(),
                userId: updatedResource.userId.toJSON(),
                name: updatedResource.name,
                version: updatedResource.version,
                learningStatus: updatedResource.learningStatus,
                type: updatedResource.type,
                skillId: skillJSON,
                description: updatedResource.description,
                dbStatus: updatedResource.dbStatus
            });

            res.status(201).send({ data: [updatedResource] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

export { router as resourceRouter };

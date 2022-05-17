import { Message, version } from 'node-nats-streaming';
import { ObjectId } from 'mongodb';
import {
    Listener,
    Subjects,
    SkillCreatedEvent,
    SkillDeletedEvent,
    SkillUpdatedEvent
} from '@ai-common-modules/events';

import { queueGroupName } from './quegroup';
import { natsWrapper } from '../../nats-wrapper';
import { ResourceUpdatedPublisher } from './publishers';
import { Skills } from '../models/skills';
import { Resource } from '../models/resource';

export class SkillCreatedListner extends Listener<SkillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: SkillCreatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, userId, name, version, resourceId } = data;
            const convertedId = new ObjectId(_id);
            const parsedUserId = new ObjectId(userId);

            // persist the data in the skills database created in resource collection
            const parsedResourceIdArray = resourceId?.length
                ? resourceId.map((id) => {
                      return new ObjectId(id);
                  })
                : undefined;

            const skillCreated = await Skills.insertSkill({
                _id: convertedId,
                userId: parsedUserId,
                name: name,
                version: version,
                resourceId: parsedResourceIdArray
            });
            msg.ack();
        } catch (err) {
            console.log(err);
        }
    }
}

export class SkillUpdatedListner extends Listener<SkillUpdatedEvent> {
    readonly subject = Subjects.SkillUpdated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: SkillUpdatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, name, version, resourceId } = data;
            const convertedId = new ObjectId(_id);
            const existingVersion = version - 1;
            // persist the data in the skills database created in resource collection
            // Only process if version is 1 greater then current version in database
            const existingSkill = await Skills.findSkillByIdAndVersion(
                convertedId,
                existingVersion
            );
            if (existingSkill) {
                // that means you are processing right event
                const parsedResourceIdArray = resourceId?.length
                    ? resourceId.map((id) => {
                          return new ObjectId(id);
                      })
                    : undefined;

                const skillUpdated = await Skills.updateSkill({
                    _id: convertedId,
                    name: name,
                    version: version,
                    resourceId: parsedResourceIdArray
                });
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class skillDeletedListener extends Listener<SkillDeletedEvent> {
    readonly subject = Subjects.SkillDeleted;
    queueGroupName = queueGroupName;

    async onMessage(
        data: SkillDeletedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, version, resourceId } = data;

            // sanity check: check if skill exists in skill database in resource service
            const skillId = new ObjectId(_id);
            const existingSkill = await Skills.findSkillByIdAndVersion(
                skillId,
                version
            );

            if (!existingSkill)
                throw new Error('cannot find skill record with skill id');

            // if skillId exists we have to delete it from skill database
            // regardless of whether this skill was assosciated with resource or not
            const deletedSkill = await Skills.deleteSkillById(skillId);

            const parsedResourceIdArray = resourceId?.length
                ? resourceId.map((id) => {
                      return new ObjectId(id);
                  })
                : undefined;

            // If skill was assosciated with a resource then we need to update resource database to remove that skill Id
            // If it was not assosciated we will just acknowledge that we have processed the event
            if (deletedSkill && parsedResourceIdArray) {
                // sanity check: check if the supplied resourceId is correct

                const existingResource = parsedResourceIdArray.map((id) => {
                    return Resource.resourceById(id);
                });

                const existingResourceReolved = await Promise.all(
                    existingResource
                );

                const updatedResources = existingResourceReolved.map(
                    (resourceDoc) => {
                        const exisitngResourceVersion = resourceDoc.version;
                        if (!exisitngResourceVersion)
                            throw new Error(
                                'resource version needed to update resource'
                            );

                        const newVersion = exisitngResourceVersion + 1;

                        return Resource.updateResourceRemoveSkillId(
                            resourceDoc._id,
                            newVersion,
                            [skillId]
                        );
                    }
                );
                const resolvedUpdatedResource = await Promise.all(
                    updatedResources
                );

                // find each resource by id and version  and publish event
                const findUpdatedResources = existingResourceReolved.map(
                    (resourceDoc) => {
                        const exisitngResourceVersion = resourceDoc.version;
                        if (!exisitngResourceVersion)
                            throw new Error(
                                'resource version needed to update resource'
                            );

                        const newVersion = exisitngResourceVersion + 1;

                        return Resource.getResourceByIdAndVersion(
                            resourceDoc._id,
                            newVersion
                        );
                    }
                );

                const resolvedUpdatedResources = await Promise.all(
                    findUpdatedResources
                );
                const publishResources = resolvedUpdatedResources.map(
                    (updatedResource) => {
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

                        return new ResourceUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
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
                    }
                );
                const resolved = await Promise.all(publishResources);

                msg.ack();
            } else if (deletedSkill && !parsedResourceIdArray) {
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

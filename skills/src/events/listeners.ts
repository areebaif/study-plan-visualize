import { Message } from 'node-nats-streaming';
import { ObjectId } from 'mongodb';
import {
    Listener,
    Subjects,
    ResourceCreatedEvent,
    ResourceDeletedEvent,
    ResourceUpdatedEvent,
    skillActiveStatus
} from '@ai-common-modules/events';
import { natsWrapper } from '../nats-wrapper';
import { queueGroupName } from './quegroup';
import { Resource } from '../models/resource';
import { Skills } from '../models/skills';
import { skillUpdatedPublisher } from './publishers';

// TODO: add user listeners

export class ResourceCreatedListner extends Listener<ResourceCreatedEvent> {
    readonly subject = Subjects.ResourceCreated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: ResourceCreatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const {
                _id,
                userId,
                name,
                learningStatus,
                version,
                type,
                skillId,
                description
            } = data;

            // create resource in the database regardless of it is assosciated with any skill or not
            const parsedResourceId = new ObjectId(_id);
            const parsedUserId = new ObjectId(userId);
            const parsedSkillIdArray = skillId
                ? skillId.map((skill) => {
                      return new ObjectId(skill);
                  })
                : undefined;

            const resourceCreated = await Resource.insertResource({
                _id: parsedResourceId,
                userId: parsedUserId,
                name: name,
                type: type,
                learningStatus: learningStatus,
                version: version,
                description: description,
                skillId: parsedSkillIdArray
            });

            if (!parsedSkillIdArray) msg.ack();

            // if resource is assosciated with skill then we need to update skill db
            if (parsedSkillIdArray) {
                const parsedResourceArray = [parsedResourceId];
                // if resourceId is associsated with multiple skills we need to do promiseAll to update every skill
                const parsedSkillArray = parsedSkillIdArray.map((skillId) => {
                    return Skills.getSkillById(skillId);
                });
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database
                const updateSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.addResource({
                        _id: skill._id,
                        version: newVersion,
                        resourceId: parsedResourceArray
                    });
                });
                const updatedSkills = await Promise.all(updateSkills);

                // find the updated skills in the database with updated version to publish skill:updated event
                const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });
                // this variable holds all the updated skill documents. Loop over them and publish skill updated event
                const resolvedUpdatedSkills = await Promise.all(
                    findUpdatedSkills
                );
                // publish event
                const publishEventPromiseAll = resolvedUpdatedSkills.map(
                    (updatedSkill) => {
                        if (
                            !updatedSkill.version ||
                            !updatedSkill.name ||
                            !updatedSkill.userId
                        )
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const userToJSON = updatedSkill.userId.toJSON();
                        const resourceToJSON = updatedSkill.resourceId?.length
                            ? updatedSkill.resourceId.map((id) => {
                                  return id.toJSON();
                              })
                            : undefined;
                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toString(),
                            userId: userToJSON,
                            name: updatedSkill.name,
                            version: updatedSkill.version,
                            resourceId: resourceToJSON,
                            dbStatus: updatedSkill.dbStatus
                        });
                    }
                );
                await Promise.all(publishEventPromiseAll);
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class ResourceUpdatedListner extends Listener<ResourceUpdatedEvent> {
    readonly subject = Subjects.ResourceUpdated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: ResourceUpdatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const {
                _id,
                userId,
                name,
                learningStatus,
                version,
                type,
                skillId,
                description
            } = data;

            // find the resource with the assosciated id: update only if the event version document is correct
            const parsedResourceId = new ObjectId(_id);
            const parsedUserId = new ObjectId(userId);
            const existingResourceVersion = version - 1;

            const existingResource = await Resource.getResourceByIdAndVersion(
                parsedResourceId,
                existingResourceVersion
            );

            if (!existingResource)
                throw new Error(
                    'cannot find resource with this id and version'
                );

            // santize skillId to be processed later
            const parsedSkillIdArray = skillId
                ? skillId.map((skill) => new ObjectId(skill))
                : undefined;

            // we will update resource regardless of what happens to the relationship between resource and skill after the update event
            const resourceUpdated = await Resource.updateResource({
                _id: parsedResourceId,
                name: name,
                type: type,
                learningStatus: learningStatus,
                version: version,
                description: description,
                skillId: parsedSkillIdArray
            });

            // In order to update skill database to new relation between skill and resource
            // We need to know what was the old relationship between them. We have to compare skillArray in previous record
            // to skill array in this event

            // 1/4 there was no assosciated skillId in the last version of resource document and new version of resource document
            // we just acknowledge the message. No relationship have changed
            if (!parsedSkillIdArray && !existingResource.skillId) msg.ack();

            // 2/4 this is the case when there were existing skillId in old version of resource but no more skillId now
            // we simply remove resourceId from all records in skill database
            // This holds an edge case. What if resource update event is triggered by skill delete event and skill and resource had a previos relationship
            // So we will only update active skills records
            if (!parsedSkillIdArray && existingResource.skillId) {
                console.log('inside 2nd case');
                const parsedSkillArray = existingResource.skillId.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database if skill is active
                const activeSkill = resolvedSkillDoc.filter((skill) => {
                    return skill.dbStatus === skillActiveStatus.active;
                });
                if (activeSkill.length) {
                    const parsedResourceArray = [parsedResourceId];
                    const updateSkills = resolvedSkillDoc.map((skill) => {
                        if (!skill.version || !skill._id)
                            throw new Error('version not defined');
                        const newVersion = skill.version + 1;
                        return Skills.removeResource({
                            _id: skill._id,
                            version: newVersion,
                            resourceId: parsedResourceArray
                        });
                    });
                    const updatedSkills = await Promise.all(updateSkills);

                    // find the updated records in the database to publish event
                    const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                        if (!skill.version)
                            throw new Error('version not defined');

                        const newVersion = skill.version + 1;

                        return Skills.findSkillByIdAndVersion(
                            skill._id,
                            newVersion
                        );
                    });

                    const resolvedUpdatedSkills = await Promise.all(
                        findUpdatedSkills
                    );
                    // publish event
                    const publishPromiseAll = resolvedUpdatedSkills.map(
                        (updatedSkill) => {
                            if (
                                !updatedSkill.version ||
                                !updatedSkill.name ||
                                !updatedSkill.userId
                            )
                                throw new Error(
                                    'we need skill database doc details to publish this event'
                                );
                            const userToJSON = updatedSkill.userId.toJSON();
                            const resourceToJSON = updatedSkill.resourceId
                                ?.length
                                ? updatedSkill.resourceId.map((id) => {
                                      return id.toJSON();
                                  })
                                : undefined;
                            return new skillUpdatedPublisher(
                                natsWrapper.client
                            ).publish({
                                _id: updatedSkill._id.toJSON(),
                                userId: userToJSON,
                                name: updatedSkill.name,
                                version: updatedSkill.version,
                                resourceId: resourceToJSON,
                                dbStatus: updatedSkill.dbStatus
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                    msg.ack();
                } else msg.ack();
            }

            // 3/4 this handles the case when there are new skillId but no old skillId. So this is like a createResource case
            // This scenario will happen if resource service was assosciated with some other service like language
            if (parsedSkillIdArray && !existingResource.skillId) {
                console.log('inside 3rd case');
                const parsedResourceArray = [parsedResourceId];
                const parsedSkillArray = parsedSkillIdArray.map((skillId) => {
                    return Skills.getSkillById(skillId);
                });
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database
                const updateSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.addResource({
                        _id: skill._id,
                        version: newVersion,
                        resourceId: parsedResourceArray
                    });
                });
                const updatedSkills = await Promise.all(updateSkills);

                // find the updated skills in the database with updated version to publish skill:updated event
                const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });
                // this variable holds all the updated skill documents. Loop over them and publish skill updated event
                const resolvedUpdatedSkills = await Promise.all(
                    findUpdatedSkills
                );
                // publish event
                const publishEventPromiseAll = resolvedUpdatedSkills.map(
                    (updatedSkill) => {
                        if (
                            !updatedSkill.version ||
                            !updatedSkill.name ||
                            !updatedSkill.userId
                        )
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const userToJSON = updatedSkill.userId.toJSON();
                        const resourceToJSON = updatedSkill.resourceId?.length
                            ? updatedSkill.resourceId.map((id) => {
                                  return id.toJSON();
                              })
                            : undefined;
                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toString(),
                            userId: userToJSON,
                            name: updatedSkill.name,
                            version: updatedSkill.version,
                            resourceId: resourceToJSON,
                            dbStatus: updatedSkill.dbStatus
                        });
                    }
                );
                await Promise.all(publishEventPromiseAll);
                msg.ack();
            }
            // 4/4 where skill already has relationship with resource but some relationship bewteen skill and resource changed in this version
            // We need to find out which relationship have been updated
            // This might also hold the edge case where skill delete triggered a resource update event
            if (parsedSkillIdArray && existingResource.skillId) {
                // we will create two arrays one with oldSkillId and one with new SkillIds
                // we will compare both of them to see which skillId have been removed and which ahve been added and which skillId have remain same

                // create a copy of parsedSkillIdArray: newSkillAray recieved in resourceUpdatedEvent
                let newSkillIdtoBeProcessed: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < parsedSkillIdArray.length; x++) {
                    const value = parsedSkillIdArray[x];
                    newSkillIdtoBeProcessed[x] = { id: value, found: true };
                }
                // create a skillId copy of the oldSkillArray: skillArray in existingResource
                const exisitngSkillId: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < existingResource.skillId.length; x++) {
                    const value = existingResource.skillId[x];
                    exisitngSkillId[x] = { id: value, found: false };
                }

                // This is the logic to check if which SkillId changed
                for (let x = 0; x < exisitngSkillId.length; x++) {
                    let found;
                    for (let y = 0; y < newSkillIdtoBeProcessed.length; y++) {
                        found = false;
                        // do string comparisions and check since mongodb id is a class
                        const stringExistingSkillString =
                            exisitngSkillId[x].id.toString();
                        const newSkillToString =
                            newSkillIdtoBeProcessed[y].id.toString();
                        if (stringExistingSkillString === newSkillToString) {
                            found = true;
                        }
                        if (found) {
                            newSkillIdtoBeProcessed[y].found = false;
                            if (!exisitngSkillId[x].found)
                                exisitngSkillId[x].found = true;
                        }
                    }
                }
                const resourceIdtobeAddedToSkill: ObjectId[] = [];
                const resourceIdtobeDeletedfromSkill: ObjectId[] = [];
                for (let x = 0; x < newSkillIdtoBeProcessed.length; x++) {
                    if (newSkillIdtoBeProcessed[x].found)
                        resourceIdtobeAddedToSkill.push(
                            newSkillIdtoBeProcessed[x].id
                        );
                }

                for (let x = 0; x < exisitngSkillId.length; x++) {
                    if (!exisitngSkillId[x].found)
                        resourceIdtobeDeletedfromSkill.push(
                            exisitngSkillId[x].id
                        );
                }
                // update the skill database for deleteresourceId
                // again handle edge case what if skillUpdated due to skill delete event being triggered
                const deleteSkillIdArray = resourceIdtobeDeletedfromSkill.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolveddeleteSkillDocs = await Promise.all(
                    deleteSkillIdArray
                );
                const updateOnlySkillInUse = resolveddeleteSkillDocs.filter(
                    (skill) => {
                        return skill.dbStatus === skillActiveStatus.active;
                    }
                );
                if (updateOnlySkillInUse.length) {
                    // TODO: this is the pop case we are deleting
                    const resourceArray = [parsedResourceId];
                    const updateDeleteResourceId = updateOnlySkillInUse.map(
                        (skill) => {
                            if (!skill.version)
                                throw new Error('version not defined');
                            const newVersion = skill.version + 1;
                            return Skills.removeResource({
                                _id: skill._id,
                                version: newVersion,
                                resourceId: resourceArray
                            });
                        }
                    );

                    const updatedSkillwithDelete = await Promise.all(
                        updateDeleteResourceId
                    );

                    const findUpdatedSkills = resolveddeleteSkillDocs.map(
                        (skill) => {
                            if (!skill.version)
                                throw new Error('version not defined');
                            const newVersion = skill.version + 1;
                            return Skills.findSkillByIdAndVersion(
                                skill._id,
                                newVersion
                            );
                        }
                    );

                    const resolvedDeletedSkills = await Promise.all(
                        findUpdatedSkills
                    );
                    // publish event
                    const publishPromiseAll = resolvedDeletedSkills.map(
                        (updatedSkill) => {
                            if (
                                !updatedSkill.version ||
                                !updatedSkill.name ||
                                !updatedSkill.userId
                            )
                                throw new Error(
                                    'we need skill database doc details to publish this event'
                                );
                            const userToJSON = updatedSkill.userId.toJSON();
                            const resourceToJSON = updatedSkill.resourceId
                                ?.length
                                ? updatedSkill.resourceId.map((id) => {
                                      return id.toJSON();
                                  })
                                : undefined;
                            return new skillUpdatedPublisher(
                                natsWrapper.client
                            ).publish({
                                _id: updatedSkill._id.toJSON(),
                                userId: userToJSON,
                                name: updatedSkill.name,
                                version: updatedSkill.version,
                                resourceId: resourceToJSON,
                                dbStatus: updatedSkill.dbStatus
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                }

                // add new resourceId to skill database
                const resourceArray = [parsedResourceId];
                const addSkillIdArray = resourceIdtobeAddedToSkill.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolvedAddSkillIdDoc = await Promise.all(
                    addSkillIdArray
                );

                const updateAddResourceId = resolvedAddSkillIdDoc.map(
                    (skill) => {
                        if (!skill.version)
                            throw new Error('version not defined');
                        const newVersion = skill.version + 1;
                        return Skills.addResource({
                            _id: skill._id,
                            version: newVersion,
                            resourceId: resourceArray
                        });
                    }
                );
                const updatedSkillwithAdd = await Promise.all(
                    updateAddResourceId
                );

                const findAddSkills = resolvedAddSkillIdDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });

                const resolvedAddSkills = await Promise.all(findAddSkills);
                // publish event
                const publishPromiseAddAll = resolvedAddSkills.map(
                    (updatedSkill) => {
                        if (
                            !updatedSkill.version ||
                            !updatedSkill.name ||
                            !updatedSkill.userId
                        )
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const userToJSON = updatedSkill.userId.toJSON();
                        const resourceToJSON = updatedSkill.resourceId?.length
                            ? updatedSkill.resourceId.map((id) => {
                                  return id.toJSON();
                              })
                            : undefined;
                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toJSON(),
                            userId: userToJSON,
                            name: updatedSkill.name,
                            version: updatedSkill.version,
                            resourceId: resourceToJSON,
                            dbStatus: updatedSkill.dbStatus
                        });
                    }
                );
                await Promise.all(publishPromiseAddAll);

                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class ResourceDeletedListner extends Listener<ResourceDeletedEvent> {
    readonly subject = Subjects.ResourceDeleted;
    queueGroupName = queueGroupName;
    async onMessage(
        data: ResourceDeletedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, version } = data;
            // check we have correct event version and then only update
            const existingVersion = version;
            const parsedResourceId = new ObjectId(_id);
            // this will be used later to update skills database
            const resourceIdArray = [parsedResourceId];
            const existingResource = await Resource.getResourceByIdAndVersion(
                parsedResourceId,
                existingVersion
            );
            if (!existingVersion)
                throw new Error(
                    'Mismatch between existing version and event version, we cannot process yet'
                );
            const deleteResource = await Resource.deleteResourceById(
                parsedResourceId
            );
            if (!deleteResource)
                throw new Error(
                    'something went wrong and we will reporcess event when they are sent back to us again'
                );

            // if existingResource did not have any skillid we can just ackowledge the event
            if (!existingResource.skillId) msg.ack();

            // check if the deleted resource had any skills attached to it. Go update those skill docs
            if (existingResource.skillId) {
                const parsedSkillArray = existingResource.skillId.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database
                const updateSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version || !skill._id)
                        throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.removeResource({
                        _id: skill._id,
                        version: newVersion,
                        resourceId: resourceIdArray
                    });
                });
                const updatedSkills = await Promise.all(updateSkills);

                const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });

                const resolvedUpdatedSkills = await Promise.all(
                    findUpdatedSkills
                );
                // publish event
                const publishPromiseAll = resolvedUpdatedSkills.map(
                    (updatedSkill) => {
                        if (
                            !updatedSkill.version ||
                            !updatedSkill.name ||
                            !updatedSkill.userId
                        )
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );

                        const userToJSON = updatedSkill.userId.toJSON();
                        const resourceToJSON = updatedSkill.resourceId?.length
                            ? updatedSkill.resourceId.map((id) => {
                                  return id.toJSON();
                              })
                            : undefined;

                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toJSON(),
                            userId: userToJSON,
                            name: updatedSkill.name,
                            version: updatedSkill.version,
                            resourceId: resourceToJSON,
                            dbStatus: updatedSkill.dbStatus
                        });
                    }
                );
                await Promise.all(publishPromiseAll);
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

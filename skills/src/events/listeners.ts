import { Message } from 'node-nats-streaming';
import { ObjectId } from 'mongodb';
import {
    Listener,
    Subjects,
    ResourceCreatedEvent,
    ResourceDeletedEvent,
    ResourceUpdatedEvent
} from '@ai-common-modules/events';
import { natsWrapper } from '../nats-wrapper';
import { queueGroupName } from './quegroup';
import { Resource } from '../models/resource';
import { Skills } from '../models/skills';
import { skillUpdatedPublisher } from './publishers';

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
            const { _id, name, courseURL, learningStatus, skillId, version } =
                data;
            // find the course with the assosciated id: update only if the event version document is correct
            const parsedCourseId = new ObjectId(_id);
            const existingCourseVersion = version - 1;
            const existingCourse = await Course.getCourseByIdAndVersion(
                parsedCourseId,
                existingCourseVersion
            );
            if (!existingCourse)
                throw new Error('cannot find course with this id and version');

            // santize skillId to be processed later
            const parsedSkillIdArray = skillId
                ? skillId.map((skill) => new ObjectId(skill))
                : undefined;

            // we will update course regardless of what happens to the relationship between course and skill after the update event
            const courseUpdated = await Course.updateCourse({
                _id: parsedCourseId,
                name: name,
                courseURL: courseURL,
                learningStatus: learningStatus,
                version: version,
                skillId: parsedSkillIdArray
            });

            // In order to update skill database to new relation between skill and course
            // We need to know what was the old relationship between them. We have to compare skillArray in previous record
            // to skill array in this event

            // 1/4 there was no assosciated skillId in the last version of course document and new version of course document
            // we just acknowledge the message. No relationship have changed
            if (!parsedSkillIdArray && !existingCourse.skillId) msg.ack();

            // 2/4 this is the case when there were existing skillId in old version of course but no more skillId now
            // we simply remove courseId from all records in skill database
            // This holds an edge case. What if course update event is triggered by skill delete event and skill and course had a previos relationship
            // So we will only update active skills records
            if (!parsedSkillIdArray && existingCourse.skillId) {
                console.log('inside 2nd case');
                const parsedSkillArray = existingCourse.skillId.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database if skill is active
                const activeSkill = resolvedSkillDoc.filter((skill) => {
                    return skill.dbStatus === databaseStatus.active;
                });
                if (activeSkill.length) {
                    const parsedCourseArray = [parsedCourseId];
                    const updateSkills = resolvedSkillDoc.map((skill) => {
                        if (!skill.version || !skill._id)
                            throw new Error('version not defined');
                        const newVersion = skill.version + 1;
                        return Skills.removeCourses({
                            _id: skill._id,
                            version: newVersion,
                            course: parsedCourseArray
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
                            const courseToJSON = updatedSkill.course?.length
                                ? updatedSkill.course.map((id) => {
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
                                course: courseToJSON
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                    msg.ack();
                } else msg.ack();
            }

            // 3/4 this handles the case when there are new skillId but no old skillId. So this is like a createcourse case
            // This scenario will happen if course service was assosciated with some other service like language
            if (parsedSkillIdArray && !existingCourse.skillId) {
                console.log('inside 3rd case');
                const parsedCourseArray = [parsedCourseId];
                const parsedSkillArray = parsedSkillIdArray.map((skillId) => {
                    return Skills.getSkillById(skillId);
                });
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database
                const updateSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.addCourses({
                        // TODO: we need to push here
                        _id: skill._id,
                        version: newVersion,
                        course: parsedCourseArray
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
                        const courseToJSON = updatedSkill.course?.length
                            ? updatedSkill.course.map((id) => {
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
                            course: courseToJSON
                        });
                    }
                );
                await Promise.all(publishEventPromiseAll);
                msg.ack();
            }
            // 4/4 where skill already has relationship with course but some relationship bewteen skill and course changed in this version
            // We need to find out which relationship have been updated
            // This might also hold the edge case where skill delete triggered a course update event
            if (parsedSkillIdArray && existingCourse.skillId) {
                // we will create two arrays one with oldSkillId and one with new SkillIds
                // we will compare both of them to see which skillId have been removed and which ahve been added and which skillId have remain same

                // create a copy of parsedSkillIdArray: newSkillAray recieved in courseUpdatedEvent
                let newSkillIdtoBeProcessed: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < parsedSkillIdArray.length; x++) {
                    const value = parsedSkillIdArray[x];
                    newSkillIdtoBeProcessed[x] = { id: value, found: true };
                }
                // create a skillId copy of the oldSkillArray: skillArray in existingCourse
                const exisitngSkillId: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < existingCourse.skillId.length; x++) {
                    const value = existingCourse.skillId[x];
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
                const courseIdtobeAddedToSkill: ObjectId[] = [];
                const courseIdtobeDeletedfromSkill: ObjectId[] = [];
                for (let x = 0; x < newSkillIdtoBeProcessed.length; x++) {
                    if (newSkillIdtoBeProcessed[x].found)
                        courseIdtobeAddedToSkill.push(
                            newSkillIdtoBeProcessed[x].id
                        );
                }

                for (let x = 0; x < exisitngSkillId.length; x++) {
                    if (!exisitngSkillId[x].found)
                        courseIdtobeDeletedfromSkill.push(
                            exisitngSkillId[x].id
                        );
                }
                // update the skill database for deletecourseId
                // again handle edge case what if skillUpdated due to skill delete event being triggered
                const deleteSkillIdArray = courseIdtobeDeletedfromSkill.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolveddeleteSkillDocs = await Promise.all(
                    deleteSkillIdArray
                );
                const updateOnlySkillInUse = resolveddeleteSkillDocs.filter(
                    (skill) => {
                        return skill.dbStatus === databaseStatus.active;
                    }
                );
                if (updateOnlySkillInUse.length) {
                    // TODO: this is the pop case we are deleting
                    const courseArray = [parsedCourseId];
                    const updateDeleteCourseId = updateOnlySkillInUse.map(
                        (skill) => {
                            if (!skill.version)
                                throw new Error('version not defined');
                            const newVersion = skill.version + 1;
                            return Skills.removeCourses({
                                _id: skill._id,
                                version: newVersion,
                                course: courseArray
                            });
                        }
                    );

                    const updatedSkillwithDelete = await Promise.all(
                        updateDeleteCourseId
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
                            const courseToJSON = updatedSkill.course?.length
                                ? updatedSkill.course.map((id) => {
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
                                course: courseToJSON
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                }

                // add new courseId to skill database
                const courseArray = [parsedCourseId];
                const addSkillIdArray = courseIdtobeAddedToSkill.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolvedAddSkillIdDoc = await Promise.all(
                    addSkillIdArray
                );

                const updateAddCourseId = resolvedAddSkillIdDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    // TODO: this is the add case we are adding push case
                    return Skills.addCourses({
                        _id: skill._id,
                        version: newVersion,
                        course: courseArray
                    });
                });
                const updatedSkillwithAdd = await Promise.all(
                    updateAddCourseId
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
                        const courseToJSON = updatedSkill.course?.length
                            ? updatedSkill.course.map((id) => {
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
                            course: courseToJSON
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
            const { _id, skillId, version } = data;
            // check we have correct event version and then only update
            const existingVersion = version;
            const parsedCourseId = new ObjectId(_id);
            const courseArray = [parsedCourseId];
            const existingCourse = await Course.getCourseByIdAndVersion(
                parsedCourseId,
                existingVersion
            );
            if (!existingVersion)
                throw new Error(
                    'Mismatch between existing version and event version, we cannot process yet'
                );
            const deleteCourse = await Course.deleteCourseById(parsedCourseId);
            if (!deleteCourse)
                throw new Error(
                    'something went wrong and we will reporcess event when they are sent back to us again'
                );

            // if existingCourse did not have any skillid we can just ackowledge the event
            if (!existingCourse.skillId) msg.ack();

            // check if the deleted course had any skills attached to it. Go update those skill docs
            if (existingCourse.skillId) {
                const parsedSkillArray = existingCourse.skillId.map(
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
                    return Skills.removeCourses({
                        // this is a pop case remove course ID
                        _id: skill._id,
                        version: newVersion,
                        course: courseArray
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
                        const courseToJSON = updatedSkill.course?.length
                            ? updatedSkill.course.map((id) => {
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
                            course: courseToJSON
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

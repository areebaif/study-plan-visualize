import { Message, version } from 'node-nats-streaming';
import { ObjectId } from 'mongodb';
import {
    Listener,
    Subjects,
    skillCreatedEvent,
    skillDeletedEvent,
    skillUpdatedEvent,
    programmingLngCreatedEvent,
    programmingLngUpdatedEvent,
    programmingLngDeletedEvent
} from '@ai-common-modules/events';

import { queueGroupName } from './quegroup';
import { natsWrapper } from '../../nats-wrapper';
import { CourseUpdatedPublisher } from './publishers';
import { Skills } from '../models/skills';
import { Course } from '../models/resource';
import { ProgrammingLng } from '../models/programmingLng';

export class SkillCreatedListner extends Listener<skillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: skillCreatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            // TODO: turn course into array
            const { _id, name, version, course } = data;
            const convertedId = new ObjectId(_id);
            // persist the data in the skills database created in course collection
            const parsedCourseIdArray = course?.length
                ? course.map((id) => {
                      return new ObjectId(id);
                  })
                : undefined;

            const skillCreated = await Skills.insertSkill({
                _id: convertedId,
                name: name,
                version: version,
                course: parsedCourseIdArray
            });
            msg.ack();
        } catch (err) {
            console.log(err);
        }
    }
}

export class SkillUpdatedListner extends Listener<skillUpdatedEvent> {
    readonly subject = Subjects.SkillUpdated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: skillUpdatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            // TODO: turn course into array
            const { _id, name, version, course } = data;
            const convertedId = new ObjectId(_id);
            const existingVersion = version - 1;
            // persist the data in the skills database created in course collection
            // Only process if version is 1 greater then current version in database
            const existingSkill = await Skills.findSkillByIdAndVersion(
                convertedId,
                existingVersion
            );
            if (existingSkill) {
                // that means you are processing right event
                const parsedCourseIdArray = course?.length
                    ? course.map((id) => {
                          return new ObjectId(id);
                      })
                    : undefined;

                const skillUpdated = await Skills.updateSkill({
                    _id: convertedId,
                    name: name,
                    version: version,
                    course: parsedCourseIdArray
                });
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class skillDeletedListener extends Listener<skillDeletedEvent> {
    readonly subject = Subjects.SkillDeleted;
    queueGroupName = queueGroupName;

    async onMessage(
        data: skillDeletedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            // TODO: turn course into array
            const { _id, version, course } = data;

            // sanity check: check if skill exists in skill database in course service
            const skillId = new ObjectId(_id);
            const existingSkill = await Skills.findSkillByIdAndVersion(
                skillId,
                version
            );

            if (!existingSkill)
                throw new Error('cannot find skill record with skill id');

            // if skillId exists we have to delete it from skill database
            // regardless of whether this skill was assosciated with course or not
            const deletedSkill = await Skills.deleteSkillById(skillId);

            const parsedCourseIdArray = course?.length
                ? course.map((id) => {
                      return new ObjectId(id);
                  })
                : undefined;

            // If skill was assosciated with a course then we need to update course database to remove that skill Id
            // If it was not assosciated we will just acknowledge that we have processed the event
            if (deletedSkill && parsedCourseIdArray) {
                // sanity check: check if the supplied courseId is correct

                const existingCourse = parsedCourseIdArray.map((id) => {
                    return Course.getCourseById(id);
                });

                const existingCourseReolved = await Promise.all(existingCourse);

                const updatedCourses = existingCourseReolved.map(
                    (courseDoc) => {
                        const exisitngCourseVersion = courseDoc.version;
                        if (!exisitngCourseVersion)
                            throw new Error(
                                'course version needed to update course'
                            );

                        const newVersion = exisitngCourseVersion + 1;

                        return Course.updateCourseRemoveSkillId(
                            courseDoc._id,
                            newVersion,
                            [skillId]
                        );
                    }
                );
                const resolvedUpdatedCourse = await Promise.all(updatedCourses);

                // find each course by id and version  and publish event
                // TODO: put version here too
                const publishCourses = parsedCourseIdArray.map((id) => {
                    return Course.getCourseById(id);
                });
                const resolvedPublishCourses = await Promise.all(
                    publishCourses
                );
                const test = resolvedPublishCourses.map((updatedCourse) => {
                    if (
                        !updatedCourse.name ||
                        !updatedCourse.version ||
                        !updatedCourse.learningStatus
                    )
                        throw new Error(
                            'we need course, version, database status to publish event'
                        );

                    const skillJSON = updatedCourse.skillId?.map((id) => {
                        return id.toJSON();
                    });

                    const languageJSON = updatedCourse.languageId?.map((id) => {
                        return id.toJSON();
                    });

                    return new CourseUpdatedPublisher(
                        natsWrapper.client
                    ).publish({
                        _id: updatedCourse._id.toString(),
                        userId: 'test',
                        name: updatedCourse.name,
                        learningStatus: updatedCourse.learningStatus,
                        version: updatedCourse.version,
                        skillId: skillJSON,
                        languageId: languageJSON
                    });
                });
                const resolved = await Promise.all(test);

                msg.ack();
            } else if (deletedSkill) {
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

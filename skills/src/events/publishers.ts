import {
    Publisher,
    Subjects,
    SkillCreatedEvent,
    SkillUpdatedEvent,
    SkillDeletedEvent
} from '@ai-common-modules/events';

export class skillCreatedPublisher extends Publisher<SkillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
}

export class skillDeletedPublisher extends Publisher<SkillDeletedEvent> {
    readonly subject = Subjects.SkillDeleted;
}

export class skillUpdatedPublisher extends Publisher<SkillUpdatedEvent> {
    readonly subject = Subjects.SkillUpdated;
}

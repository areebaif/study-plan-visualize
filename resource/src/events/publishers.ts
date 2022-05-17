import {
    Publisher,
    Subjects,
    ResourceCreatedEvent,
    ResourceDeletedEvent,
    ResourceUpdatedEvent
} from '@ai-common-modules/events';

export class ResourceCreatedPublisher extends Publisher<ResourceCreatedEvent> {
    readonly subject = Subjects.ResourceCreated;
}

export class ResourceDeletedPublisher extends Publisher<ResourceDeletedEvent> {
    readonly subject = Subjects.ResourceDeleted;
}

export class ResourceUpdatedPublisher extends Publisher<ResourceUpdatedEvent> {
    readonly subject = Subjects.ResourceUpdated;
}

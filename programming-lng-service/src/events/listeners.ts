import { Message } from 'node-nats-streaming';
import { ObjectId } from 'mongodb';
import {
    Listener,
    Subjects,
    courseCreatedEvent,
    courseDeletedEvent,
    courseUpdatedEvent,
    bookCreatedEvent,
    bookDeletedEvent,
    bookUpdatedEvent
} from '@ai-common-modules/events';
import { natsWrapper } from '../nats-wrapper';
import { queueGroupName } from './quegroup';
import { Course } from '../models/course';
import { Book } from '../models/book';
import { databaseStatus, ProgrammingLng } from '../models/programmingLng';
import { programmingLngUpdatedPublisher } from './publishers';

export class CourseCreatedListner extends Listener<courseCreatedEvent> {
    readonly subject = Subjects.CourseCreated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: courseCreatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const {
                _id,
                name,
                courseURL,
                learningStatus,
                languageId,
                version
            } = data;
            // create course in the database regardless if it is assosciated with Languages or not
            const parsedCourseId = new ObjectId(_id);
            const parsedLanguageIdArray = languageId
                ? languageId.map((language) => {
                      return new ObjectId(language);
                  })
                : undefined;

            const courseCreated = await Course.insertCourse({
                _id: parsedCourseId,
                name: name,
                courseURL: courseURL,
                learningStatus: learningStatus,
                version: version,
                languageId: parsedLanguageIdArray
            });

            if (!parsedLanguageIdArray) msg.ack();

            // if course is assosciated with programming then we need to update Language db
            if (parsedLanguageIdArray) {
                // if courseId is associsated with multiple Languages we need to do promiseAll to update every Language
                const parsedLanguageArray = parsedLanguageIdArray.map((id) => {
                    return ProgrammingLng.getProgrammingLngById(id);
                });
                const resolvedDoc = await Promise.all(parsedLanguageArray);

                // update the Language database
                const updateLanguage = resolvedDoc.map((doc) => {
                    if (!doc.version) throw new Error('version not defined');
                    const newVersion = doc.version + 1;
                    return ProgrammingLng.updateProgrammingLngByCourse({
                        _id: doc._id,
                        version: newVersion,
                        course: parsedCourseId
                    });
                });
                const updatedLanguage = await Promise.all(updateLanguage);

                // find the updated Language in the database with updated version to publish Language:updated event
                const findUpdatedLanguage = resolvedDoc.map((doc) => {
                    if (!doc.version) throw new Error('version not defined');
                    const newVersion = doc.version + 1;
                    return ProgrammingLng.findProgrammingLngByIdAndVersion(
                        doc._id,
                        newVersion
                    );
                });
                // this variable holds all the updated Language documents. Loop over them and publish Language updated event
                const resolvedUpdatedLanguages = await Promise.all(
                    findUpdatedLanguage
                );
                // publish event
                const publishEventPromiseAll = resolvedUpdatedLanguages.map(
                    (updatedLanguage) => {
                        if (!updatedLanguage.version || !updatedLanguage.name)
                            throw new Error(
                                'we need Language database doc details to publish this event'
                            );
                        const courseToJSON = updatedLanguage.course
                            ? updatedLanguage.course.toJSON()
                            : undefined;
                        return new programmingLngUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedLanguage._id.toString(),
                            name: updatedLanguage.name,
                            version: updatedLanguage.version,
                            course: courseToJSON
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

export class CourseUpdatedListner extends Listener<courseUpdatedEvent> {
    readonly subject = Subjects.CourseUpdated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: courseUpdatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const {
                _id,
                name,
                courseURL,
                learningStatus,
                languageId,
                version
            } = data;
            // find the course with the assosciated id: update only if the event version document is correct
            const parsedCourseId = new ObjectId(_id);
            const existingCourseVersion = version - 1;
            const existingCourse = await Course.getCourseByIdAndVersion(
                parsedCourseId,
                existingCourseVersion
            );
            if (!existingCourse)
                throw new Error('cannot find course with this id and version');

            // santize languageId to be processed later
            const parsedLanguageIdArray = languageId
                ? languageId.map((id) => new ObjectId(id))
                : undefined;

            // we will update course regardless of what happens to the relationship between course and language after the update event
            const courseUpdated = await Course.updateCourse({
                _id: parsedCourseId,
                name: name,
                courseURL: courseURL,
                learningStatus: learningStatus,
                version: version,
                languageId: parsedLanguageIdArray
            });

            // In order to update language database to new relation between language and course
            // We need to know what was the old relationship between them. We have to compare languageArray in previous record
            // to language array in this event

            // 1/4 there was no assosciated languageId in the last version of course document and new version of course document
            // we just acknowledge the message. No relationship have changed
            if (!parsedLanguageIdArray && !existingCourse.languageId) msg.ack();

            // 2/4 this is the case when there were existing LanguageId in old version of course but no more LanguageId now
            // we simply remove courseId from all records in Language database
            // This holds an edge case. What if course update event is triggered by Language delete event and Language and course had a previos relationship
            // So we will only update active Languages records
            if (!parsedLanguageIdArray && existingCourse.languageId) {
                console.log('inside 2nd case');
                const parsedLanguageArray = existingCourse.languageId.map(
                    (languageId) => {
                        return ProgrammingLng.getProgrammingLngById(languageId);
                    }
                );
                const resolvedDoc = await Promise.all(parsedLanguageArray);

                // update the language database if language is active
                const activeLanguage = resolvedDoc.filter((doc) => {
                    return doc.dbStatus === databaseStatus.active;
                });
                if (activeLanguage.length) {
                    const updateLanguage = resolvedDoc.map((doc) => {
                        if (!doc.version || !doc._id)
                            throw new Error('version not defined');
                        const newVersion = doc.version + 1;
                        return ProgrammingLng.updateProgrammingLngByCourse({
                            _id: doc._id,
                            version: newVersion,
                            course: undefined
                        });
                    });
                    const updatedLanguage = await Promise.all(updateLanguage);

                    // find the updated records in the database to publish event
                    const findUpdatedLanguages = resolvedDoc.map((doc) => {
                        if (!doc.version)
                            throw new Error('version not defined');

                        const newVersion = doc.version + 1;

                        return ProgrammingLng.findProgrammingLngByIdAndVersion(
                            doc._id,
                            newVersion
                        );
                    });

                    const resolvedUpdatedLanguage = await Promise.all(
                        findUpdatedLanguages
                    );
                    // publish event
                    const publishPromiseAll = resolvedUpdatedLanguage.map(
                        (updatedDoc) => {
                            if (!updatedDoc.version || !updatedDoc.name)
                                throw new Error(
                                    'we need language database doc details to publish this event'
                                );
                            const courseToJSON = updatedDoc.course
                                ? updatedDoc.course.toJSON()
                                : undefined;
                            return new programmingLngUpdatedPublisher(
                                natsWrapper.client
                            ).publish({
                                _id: updatedDoc._id.toJSON(),
                                name: updatedDoc.name,
                                version: updatedDoc.version,
                                course: courseToJSON
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                    msg.ack();
                } else msg.ack();
            }

            // 3/4 this handles the case when there are new LanguageId but no old LanguageId. So this is like a createcourse case
            // This scenario will happen if course service was assosciated with some other service like language
            if (parsedLanguageIdArray && !existingCourse.languageId) {
                console.log('inside 3rd case');
                const parsedLanguageArray = parsedLanguageIdArray.map(
                    (LanguageId) => {
                        return ProgrammingLng.getProgrammingLngById(LanguageId);
                    }
                );
                const resolvedDoc = await Promise.all(parsedLanguageArray);

                // update the Language database
                const updateLanguages = resolvedDoc.map((doc) => {
                    if (!doc.version) throw new Error('version not defined');
                    const newVersion = doc.version + 1;
                    return ProgrammingLng.updateProgrammingLngByCourse({
                        _id: doc._id,
                        version: newVersion,
                        course: parsedCourseId
                    });
                });
                const updatedLaguages = await Promise.all(updateLanguages);

                // find the updated Languages in the database with updated version to publish Language:updated event
                const findUpdatedLanguages = resolvedDoc.map((doc) => {
                    if (!doc.version) throw new Error('version not defined');
                    const newVersion = doc.version + 1;
                    return ProgrammingLng.findProgrammingLngByIdAndVersion(
                        doc._id,
                        newVersion
                    );
                });
                // this variable holds all the updated Language documents. Loop over them and publish Language updated event
                const resolvedUpdatedLanguages = await Promise.all(
                    findUpdatedLanguages
                );
                // publish event
                const publishEventPromiseAll = resolvedUpdatedLanguages.map(
                    (updatedDoc) => {
                        if (!updatedDoc.version || !updatedDoc.name)
                            throw new Error(
                                'we need programming database doc details to publish this event'
                            );
                        const courseToJSON = updatedDoc.course
                            ? updatedDoc.course.toJSON()
                            : undefined;
                        return new programmingLngUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedDoc._id.toString(),
                            name: updatedDoc.name,
                            version: updatedDoc.version,
                            course: courseToJSON
                        });
                    }
                );
                await Promise.all(publishEventPromiseAll);
                msg.ack();
            }
            // 4/4 where Language already has relationship with course but some relationship bewteen Language and course changed in this version
            // We need to find out which relationship have been updated
            // This might also hold the edge case where Language delete triggered a course update event
            if (parsedLanguageIdArray && existingCourse.languageId) {
                // we will create two arrays one with oldLanguageId and one with new LanguageIds
                // we will compare both of them to see which LanguageId have been removed and which ahve been added and which LanguageId have remain same

                // create a copy of parsedLanguageIdArray: newLanguageAray recieved in courseUpdatedEvent
                let newLanguageIdtoBeProcessed: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < parsedLanguageIdArray.length; x++) {
                    const value = parsedLanguageIdArray[x];
                    newLanguageIdtoBeProcessed[x] = { id: value, found: true };
                }
                // create a LanguageId copy of the oldLanguageArray: LanguageArray in existingCourse
                const exisitngLanguageId: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < existingCourse.languageId.length; x++) {
                    const value = existingCourse.languageId[x];
                    exisitngLanguageId[x] = { id: value, found: false };
                }

                // This is the logic to check if which languageId changed
                for (let x = 0; x < exisitngLanguageId.length; x++) {
                    let found;
                    for (
                        let y = 0;
                        y < newLanguageIdtoBeProcessed.length;
                        y++
                    ) {
                        found = false;
                        // do string comparisions and check since mongodb id is a class
                        const stringExistingLanguageString =
                            exisitngLanguageId[x].id.toString();
                        const newLanguageToString =
                            newLanguageIdtoBeProcessed[y].id.toString();
                        if (
                            stringExistingLanguageString === newLanguageToString
                        ) {
                            found = true;
                        }
                        if (found) {
                            newLanguageIdtoBeProcessed[y].found = false;
                            if (!exisitngLanguageId[x].found)
                                exisitngLanguageId[x].found = true;
                        }
                    }
                }
                const courseIdtobeAddedToLanguage: ObjectId[] = [];
                const courseIdtobeDeletedfromLanguage: ObjectId[] = [];
                for (let x = 0; x < newLanguageIdtoBeProcessed.length; x++) {
                    if (newLanguageIdtoBeProcessed[x].found)
                        courseIdtobeAddedToLanguage.push(
                            newLanguageIdtoBeProcessed[x].id
                        );
                }

                for (let x = 0; x < exisitngLanguageId.length; x++) {
                    if (!exisitngLanguageId[x].found)
                        courseIdtobeDeletedfromLanguage.push(
                            exisitngLanguageId[x].id
                        );
                }
                // update the Language database for deletecourseId
                // again handle edge case what if LanguageUpdated due to Language delete event being triggered
                const deleteLanguageIdArray =
                    courseIdtobeDeletedfromLanguage.map((id) => {
                        return ProgrammingLng.getProgrammingLngById(id);
                    });
                const resolveddeleteLanguageDocs = await Promise.all(
                    deleteLanguageIdArray
                );
                const updateOnlyLanguageInUse =
                    resolveddeleteLanguageDocs.filter((doc) => {
                        return doc.dbStatus === databaseStatus.active;
                    });
                if (updateOnlyLanguageInUse.length) {
                    const updateDeleteCourseId = updateOnlyLanguageInUse.map(
                        (doc) => {
                            if (!doc.version)
                                throw new Error('version not defined');
                            const newVersion = doc.version + 1;
                            return ProgrammingLng.updateProgrammingLngByCourse({
                                _id: doc._id,
                                version: newVersion,
                                course: undefined
                            });
                        }
                    );

                    const updatedLanguagewithDelete = await Promise.all(
                        updateDeleteCourseId
                    );

                    const findUpdatedLanguages = resolveddeleteLanguageDocs.map(
                        (doc) => {
                            if (!doc.version)
                                throw new Error('version not defined');
                            const newVersion = doc.version + 1;
                            return ProgrammingLng.findProgrammingLngByIdAndVersion(
                                doc._id,
                                newVersion
                            );
                        }
                    );

                    const resolvedDeletedLanguages = await Promise.all(
                        findUpdatedLanguages
                    );
                    // publish event
                    const publishPromiseAll = resolvedDeletedLanguages.map(
                        (updatedDoc) => {
                            if (!updatedDoc.version || !updatedDoc.name)
                                throw new Error(
                                    'we need Language database doc details to publish this event'
                                );
                            const courseToJSON = updatedDoc.course
                                ? updatedDoc.course.toJSON()
                                : undefined;
                            return new programmingLngUpdatedPublisher(
                                natsWrapper.client
                            ).publish({
                                _id: updatedDoc._id.toJSON(),
                                name: updatedDoc.name,
                                version: updatedDoc.version,
                                course: courseToJSON
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                }

                // add new courseId to Language database
                const addLanguageIdArray = courseIdtobeAddedToLanguage.map(
                    (id) => {
                        return ProgrammingLng.getProgrammingLngById(id);
                    }
                );
                const resolvedAddLanguageIdDoc = await Promise.all(
                    addLanguageIdArray
                );

                const updateAddCourseId = resolvedAddLanguageIdDoc.map(
                    (doc) => {
                        if (!doc.version)
                            throw new Error('version not defined');
                        const newVersion = doc.version + 1;
                        return ProgrammingLng.updateProgrammingLngByCourse({
                            _id: doc._id,
                            version: newVersion,
                            course: parsedCourseId
                        });
                    }
                );
                const updatedLanguagewithAdd = await Promise.all(
                    updateAddCourseId
                );

                const findAddLanguages = resolvedAddLanguageIdDoc.map((doc) => {
                    if (!doc.version) throw new Error('version not defined');
                    const newVersion = doc.version + 1;
                    return ProgrammingLng.findProgrammingLngByIdAndVersion(
                        doc._id,
                        newVersion
                    );
                });

                const resolvedAddLanguages = await Promise.all(
                    findAddLanguages
                );
                // publish event
                const publishPromiseAddAll = resolvedAddLanguages.map((doc) => {
                    if (!doc.version || !doc.name)
                        throw new Error(
                            'we need language database doc details to publish this event'
                        );
                    const courseToJSON = doc.course
                        ? doc.course.toJSON()
                        : undefined;
                    return new programmingLngUpdatedPublisher(
                        natsWrapper.client
                    ).publish({
                        _id: doc._id.toJSON(),
                        name: doc.name,
                        version: doc.version,
                        course: courseToJSON
                    });
                });
                await Promise.all(publishPromiseAddAll);

                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class CourseDeletedListner extends Listener<courseDeletedEvent> {
    readonly subject = Subjects.CourseDeleted;
    queueGroupName = queueGroupName;
    async onMessage(
        data: courseDeletedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, languageId, version } = data;
            // check we have correct event version and then only update
            const existingVersion = version;
            const parsedCourseId = new ObjectId(_id);
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

            // if existingCourse did not have any languageid we can just ackowledge the event
            if (!existingCourse.languageId) msg.ack();

            // check if the deleted course had any languages attached to it. Go update those language docs
            if (existingCourse.languageId) {
                const parsedLanguageArray = existingCourse.languageId.map(
                    (id) => {
                        return ProgrammingLng.getProgrammingLngById(id);
                    }
                );
                const resolvedDoc = await Promise.all(parsedLanguageArray);

                // update the language database
                const updateLanguages = resolvedDoc.map((doc) => {
                    if (!doc.version || !doc._id)
                        throw new Error('version not defined');
                    const newVersion = doc.version + 1;
                    return ProgrammingLng.updateProgrammingLngByCourse({
                        _id: doc._id,
                        version: newVersion,
                        course: undefined
                    });
                });
                const updatedLanguage = await Promise.all(updateLanguages);

                const findUpdatedLanguages = resolvedDoc.map((doc) => {
                    if (!doc.version) throw new Error('version not defined');
                    const newVersion = doc.version + 1;
                    return ProgrammingLng.findProgrammingLngByIdAndVersion(
                        doc._id,
                        newVersion
                    );
                });

                const resolvedUpdatedLanguages = await Promise.all(
                    findUpdatedLanguages
                );
                // publish event
                const publishPromiseAll = resolvedUpdatedLanguages.map(
                    (updatedDoc) => {
                        if (!updatedDoc.version || !updatedDoc.name)
                            throw new Error(
                                'we need programming database doc details to publish this event'
                            );
                        const courseToJSON = updatedDoc.course
                            ? updatedDoc.course.toJSON()
                            : undefined;
                        return new programmingLngUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedDoc._id.toJSON(),
                            name: updatedDoc.name,
                            version: updatedDoc.version,
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

export class BookCreatedListner extends Listener<bookCreatedEvent> {
    readonly subject = Subjects.BookCreated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: bookCreatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const {
                _id,
                name,
                bookAuthor,
                bookVersion,
                learningStatus,
                languageId,
                version
            } = data;
            // create book in the database regardless if it is assosciated with languages or not
            const parsedBookId = new ObjectId(_id);
            const parsedLanguageIdArray = languageId
                ? languageId.map((language) => {
                      return new ObjectId(language);
                  })
                : undefined;
            const bookCreated = await Book.insertBook({
                _id: parsedBookId,
                name: name,
                bookAuthor: bookAuthor,
                bookVersion: bookVersion,
                learningStatus: learningStatus,
                version: version,
                languageId: parsedLanguageIdArray
            });

            if (!parsedLanguageIdArray) msg.ack();

            // if book is assosciated with language then we need to update language db
            if (parsedLanguageIdArray) {
                // if bookId is associsated with multiple languages we need to do promiseAll to update every language
                const parsedLanguageArray = parsedLanguageIdArray.map(
                    (languageId) => {
                        return ProgrammingLng.getProgrammingLngById(languageId);
                    }
                );
                const resolvedLanguageDoc = await Promise.all(
                    parsedLanguageArray
                );
                // update the language database
                const updateLanguages = resolvedLanguageDoc.map((language) => {
                    if (!language.version)
                        throw new Error('version not defined');
                    const newVersion = language.version + 1;
                    return ProgrammingLng.updateProgrammingLngByBook({
                        _id: language._id,
                        version: newVersion,
                        book: parsedBookId
                    });
                });
                const updatedLanguages = await Promise.all(updateLanguages);

                // find the updated languages in the database with updated version to publish language:updated event
                const findUpdatedLanguages = resolvedLanguageDoc.map(
                    (language) => {
                        if (!language.version)
                            throw new Error('version not defined');
                        const newVersion = language.version + 1;
                        return ProgrammingLng.findProgrammingLngByIdAndVersion(
                            language._id,
                            newVersion
                        );
                    }
                );
                // this variable holds all the updated language documents. Loop over them and publish language updated event
                const resolvedUpdatedLanguages = await Promise.all(
                    findUpdatedLanguages
                );

                // publish event
                const publishEventPromiseAll = resolvedUpdatedLanguages.map(
                    (updatedLanguage) => {
                        if (!updatedLanguage.version || !updatedLanguage.name)
                            throw new Error(
                                'we need language database doc details to publish this event'
                            );
                        const bookToJSON = updatedLanguage.book
                            ? updatedLanguage.book.toJSON()
                            : undefined;
                        return new programmingLngUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedLanguage._id.toString(),
                            name: updatedLanguage.name,
                            version: updatedLanguage.version,
                            book: bookToJSON
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

export class BookUpdatedListner extends Listener<bookUpdatedEvent> {
    readonly subject = Subjects.BookUpdated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: bookUpdatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const {
                _id,
                name,
                bookAuthor,
                bookVersion,
                learningStatus,
                languageId,
                version
            } = data;
            // find the book with the assosciated id: update only if the event version document is correct
            const parsedBookId = new ObjectId(_id);
            const existingBookVersion = version - 1;
            const existingBook = await Book.getBookByIdAndVersion(
                parsedBookId,
                existingBookVersion
            );
            if (!existingBook)
                throw new Error('cannot find book with this id and version');

            // santize languageId to be processed later
            const parsedLanguageIdArray = languageId
                ? languageId.map((language) => new ObjectId(language))
                : undefined;

            // we will update book regardless of what happens to the relationship between book and language after the update event
            const bookUpdated = await Book.updateBook({
                _id: parsedBookId,
                name: name,
                bookAuthor: bookAuthor,
                bookVersion: bookVersion,
                learningStatus: learningStatus,
                version: version,
                languageId: parsedLanguageIdArray
            });

            // In order to update language database to new relation between language and book
            // We need to know what was the old relationship between them. We have to compare languageArray in previous record
            // to language array in this event

            // 1/4 there was no assosciated languageId in the last version of book document and new version of book document
            // we just acknowledge the message. No relationship have changed
            if (!parsedLanguageIdArray && !existingBook.languageId) msg.ack();

            // 2/4 this is the case when there were existing languageId in old version of book but no more languageId now
            // we simply remove bookId from all records in language database
            // This holds an edge case. What if book update event is triggered by language delete event and language and book had a previos relationship
            // So we will only update active languages records
            if (!parsedLanguageIdArray && existingBook.languageId) {
                const parsedLanguageArray = existingBook.languageId.map(
                    (languageId) => {
                        return ProgrammingLng.getProgrammingLngById(languageId);
                    }
                );
                const resolvedLanguageDoc = await Promise.all(
                    parsedLanguageArray
                );

                // update the language database if language is active
                const activeLanguage = resolvedLanguageDoc.filter(
                    (language) => {
                        return language.dbStatus === databaseStatus.active;
                    }
                );
                if (activeLanguage.length) {
                    const updateLanguages = resolvedLanguageDoc.map(
                        (language) => {
                            if (!language.version || !language._id)
                                throw new Error('version not defined');
                            const newVersion = language.version + 1;
                            return ProgrammingLng.updateProgrammingLngByBook({
                                _id: language._id,
                                version: newVersion,
                                book: undefined
                            });
                        }
                    );
                    const updatedLanguages = await Promise.all(updateLanguages);

                    // find the updated records in the database to publish event
                    const findUpdatedLanguages = resolvedLanguageDoc.map(
                        (language) => {
                            if (!language.version)
                                throw new Error('version not defined');

                            const newVersion = language.version + 1;

                            return ProgrammingLng.findProgrammingLngByIdAndVersion(
                                language._id,
                                newVersion
                            );
                        }
                    );

                    const resolvedUpdatedLanguages = await Promise.all(
                        findUpdatedLanguages
                    );
                    // publish event
                    const publishPromiseAll = resolvedUpdatedLanguages.map(
                        (updatedLanguage) => {
                            if (
                                !updatedLanguage.version ||
                                !updatedLanguage.name
                            )
                                throw new Error(
                                    'we need language database doc details to publish this event'
                                );
                            const bookToJSON = updatedLanguage.book
                                ? updatedLanguage.book.toJSON()
                                : undefined;
                            return new programmingLngUpdatedPublisher(
                                natsWrapper.client
                            ).publish({
                                _id: updatedLanguage._id.toJSON(),
                                name: updatedLanguage.name,
                                version: updatedLanguage.version,
                                book: bookToJSON
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                    msg.ack();
                } else msg.ack();
            }

            // 3/4 this handles the case when there are new languageId but no old languageId. So this is like a createbook case
            // This scenario will happen if book service was assosciated with some other service like language
            if (parsedLanguageIdArray && !existingBook.languageId) {
                console.log('inside 3rd case');
                const parsedLanguageArray = parsedLanguageIdArray.map(
                    (languageId) => {
                        return ProgrammingLng.getProgrammingLngById(languageId);
                    }
                );
                const resolvedLanguageDoc = await Promise.all(
                    parsedLanguageArray
                );

                // update the language database
                const updateLanguages = resolvedLanguageDoc.map((language) => {
                    if (!language.version)
                        throw new Error('version not defined');
                    const newVersion = language.version + 1;
                    return ProgrammingLng.updateProgrammingLngByBook({
                        _id: language._id,
                        version: newVersion,
                        book: parsedBookId
                    });
                });
                const updatedLanguages = await Promise.all(updateLanguages);

                // find the updated languages in the database with updated version to publish language:updated event
                const findUpdatedLanguages = resolvedLanguageDoc.map(
                    (language) => {
                        if (!language.version)
                            throw new Error('version not defined');
                        const newVersion = language.version + 1;
                        return ProgrammingLng.findProgrammingLngByIdAndVersion(
                            language._id,
                            newVersion
                        );
                    }
                );
                // this variable holds all the updated language documents. Loop over them and publish language updated event
                const resolvedUpdatedLanguages = await Promise.all(
                    findUpdatedLanguages
                );
                // publish event
                const publishEventPromiseAll = resolvedUpdatedLanguages.map(
                    (updatedLanguage) => {
                        if (!updatedLanguage.version || !updatedLanguage.name)
                            throw new Error(
                                'we need language database doc details to publish this event'
                            );
                        const bookToJSON = updatedLanguage.book
                            ? updatedLanguage.book.toJSON()
                            : undefined;
                        return new programmingLngUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedLanguage._id.toString(),
                            name: updatedLanguage.name,
                            version: updatedLanguage.version,
                            book: bookToJSON
                        });
                    }
                );
                await Promise.all(publishEventPromiseAll);
                msg.ack();
            }
            // 4/4 where language already has relationship with book but some relationship bewteen language and book changed in this version
            // We need to find out which relationship have been updated
            // This might also hold the edge case where language delete triggered a book update event
            if (parsedLanguageIdArray && existingBook.languageId) {
                // we will create two arrays one with oldLanguageId and one with new LanguageIds
                // we will compare both of them to see which languageId have been removed and which ahve been added and which languageId have remain same

                // create a copy of parsedLanguageIdArray: newLanguageAray recieved in bookUpdatedEvent
                let newLanguageIdtoBeProcessed: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < parsedLanguageIdArray.length; x++) {
                    const value = parsedLanguageIdArray[x];
                    newLanguageIdtoBeProcessed[x] = { id: value, found: true };
                }
                // create a languageId copy of the oldLanguageArray: languageArray in existingBook
                const exisitngLanguageId: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < existingBook.languageId.length; x++) {
                    const value = existingBook.languageId[x];
                    exisitngLanguageId[x] = { id: value, found: false };
                }

                // This is the logic to check if which LanguageId changed
                for (let x = 0; x < exisitngLanguageId.length; x++) {
                    let found;
                    for (
                        let y = 0;
                        y < newLanguageIdtoBeProcessed.length;
                        y++
                    ) {
                        found = false;
                        // do string comparisions and check since mongodb id is a class
                        const stringExistingLanguageString =
                            exisitngLanguageId[x].id.toString();
                        const newLanguageToString =
                            newLanguageIdtoBeProcessed[y].id.toString();
                        if (
                            stringExistingLanguageString === newLanguageToString
                        ) {
                            found = true;
                        }
                        if (found) {
                            newLanguageIdtoBeProcessed[y].found = false;
                            if (!exisitngLanguageId[x].found)
                                exisitngLanguageId[x].found = true;
                        }
                    }
                }
                const bookIdtobeAddedToLanguage: ObjectId[] = [];
                const bookIdtobeDeletedfromLanguage: ObjectId[] = [];
                for (let x = 0; x < newLanguageIdtoBeProcessed.length; x++) {
                    if (newLanguageIdtoBeProcessed[x].found)
                        bookIdtobeAddedToLanguage.push(
                            newLanguageIdtoBeProcessed[x].id
                        );
                }

                for (let x = 0; x < exisitngLanguageId.length; x++) {
                    if (!exisitngLanguageId[x].found)
                        bookIdtobeDeletedfromLanguage.push(
                            exisitngLanguageId[x].id
                        );
                }
                // update the language database for deletebookId
                // again handle edge case what if languageUpdated due to language delete event being triggered
                const deleteLanguageIdArray = bookIdtobeDeletedfromLanguage.map(
                    (languageId) => {
                        return ProgrammingLng.getProgrammingLngById(languageId);
                    }
                );
                const resolveddeleteLanguageDocs = await Promise.all(
                    deleteLanguageIdArray
                );
                const updateOnlyLanguageInUse =
                    resolveddeleteLanguageDocs.filter((language) => {
                        return language.dbStatus === databaseStatus.active;
                    });
                if (updateOnlyLanguageInUse.length) {
                    const updateDeleteBookId = updateOnlyLanguageInUse.map(
                        (language) => {
                            if (!language.version)
                                throw new Error('version not defined');
                            const newVersion = language.version + 1;
                            return ProgrammingLng.updateProgrammingLngByBook({
                                _id: language._id,
                                version: newVersion,
                                book: undefined
                            });
                        }
                    );

                    const updatedLanguagewithDelete = await Promise.all(
                        updateDeleteBookId
                    );

                    const findUpdatedLanguages = resolveddeleteLanguageDocs.map(
                        (language) => {
                            if (!language.version)
                                throw new Error('version not defined');
                            const newVersion = language.version + 1;
                            return ProgrammingLng.findProgrammingLngByIdAndVersion(
                                language._id,
                                newVersion
                            );
                        }
                    );

                    const resolvedDeletedLanguages = await Promise.all(
                        findUpdatedLanguages
                    );
                    // publish event
                    const publishPromiseAll = resolvedDeletedLanguages.map(
                        (updatedLanguage) => {
                            if (
                                !updatedLanguage.version ||
                                !updatedLanguage.name
                            )
                                throw new Error(
                                    'we need language database doc details to publish this event'
                                );
                            const bookToJSON = updatedLanguage.book
                                ? updatedLanguage.book.toJSON()
                                : undefined;
                            return new programmingLngUpdatedPublisher(
                                natsWrapper.client
                            ).publish({
                                _id: updatedLanguage._id.toJSON(),
                                name: updatedLanguage.name,
                                version: updatedLanguage.version,
                                book: bookToJSON
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                }

                // add new bookId to language database
                const addLanguageIdArray = bookIdtobeAddedToLanguage.map(
                    (languageId) => {
                        return ProgrammingLng.getProgrammingLngById(languageId);
                    }
                );
                const resolvedAddLanguageIdDoc = await Promise.all(
                    addLanguageIdArray
                );

                const updateAddBookId = resolvedAddLanguageIdDoc.map(
                    (language) => {
                        if (!language.version)
                            throw new Error('version not defined');
                        const newVersion = language.version + 1;
                        return ProgrammingLng.updateProgrammingLngByBook({
                            _id: language._id,
                            version: newVersion,
                            book: parsedBookId
                        });
                    }
                );
                const updatedLanguagewithAdd = await Promise.all(
                    updateAddBookId
                );

                const findAddLanguages = resolvedAddLanguageIdDoc.map(
                    (language) => {
                        if (!language.version)
                            throw new Error('version not defined');
                        const newVersion = language.version + 1;
                        return ProgrammingLng.findProgrammingLngByIdAndVersion(
                            language._id,
                            newVersion
                        );
                    }
                );

                const resolvedAddLanguages = await Promise.all(
                    findAddLanguages
                );
                // publish event
                const publishPromiseAddAll = resolvedAddLanguages.map(
                    (updatedLanguage) => {
                        if (!updatedLanguage.version || !updatedLanguage.name)
                            throw new Error(
                                'we need language database doc details to publish this event'
                            );
                        const bookToJSON = updatedLanguage.book
                            ? updatedLanguage.book.toJSON()
                            : undefined;
                        return new programmingLngUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedLanguage._id.toJSON(),
                            name: updatedLanguage.name,
                            version: updatedLanguage.version,
                            book: bookToJSON
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

export class BookDeletedListner extends Listener<bookDeletedEvent> {
    readonly subject = Subjects.BookDeleted;
    queueGroupName = queueGroupName;
    async onMessage(
        data: bookDeletedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, languageId, version } = data;
            // check we have correct event version and then only update
            const existingVersion = version;
            const parsedBookId = new ObjectId(_id);
            const existingBook = await Book.getBookByIdAndVersion(
                parsedBookId,
                existingVersion
            );
            if (!existingVersion)
                throw new Error(
                    'Mismatch between existing version and event version, we cannot process yet'
                );
            const deleteBook = await Book.deleteBookById(parsedBookId);
            if (!deleteBook)
                throw new Error(
                    'something went wrong and we will reporcess event when they are sent back to us again'
                );

            // if existingBook did not have any languageid we can just ackowledge the event
            if (!existingBook.languageId) msg.ack();

            // check if the deleted book had any languages attached to it. Go update those language docs
            if (existingBook.languageId) {
                const parsedLanguageArray = existingBook.languageId.map(
                    (languageId) => {
                        return ProgrammingLng.getProgrammingLngById(languageId);
                    }
                );
                const resolvedLanguageDoc = await Promise.all(
                    parsedLanguageArray
                );

                // update the language database
                const updateLanguages = resolvedLanguageDoc.map((language) => {
                    if (!language.version || !language._id)
                        throw new Error('version not defined');
                    const newVersion = language.version + 1;
                    return ProgrammingLng.updateProgrammingLngByBook({
                        _id: language._id,
                        version: newVersion,
                        book: undefined
                    });
                });
                const updatedLanguages = await Promise.all(updateLanguages);

                const findUpdatedLanguages = resolvedLanguageDoc.map(
                    (language) => {
                        if (!language.version)
                            throw new Error('version not defined');
                        const newVersion = language.version + 1;
                        return ProgrammingLng.findProgrammingLngByIdAndVersion(
                            language._id,
                            newVersion
                        );
                    }
                );

                const resolvedUpdatedLanguages = await Promise.all(
                    findUpdatedLanguages
                );
                // publish event
                const publishPromiseAll = resolvedUpdatedLanguages.map(
                    (updatedLanguage) => {
                        if (!updatedLanguage.version || !updatedLanguage.name)
                            throw new Error(
                                'we need language database doc details to publish this event'
                            );
                        const bookToJSON = updatedLanguage.book
                            ? updatedLanguage.book.toJSON()
                            : undefined;
                        return new programmingLngUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedLanguage._id.toJSON(),
                            name: updatedLanguage.name,
                            version: updatedLanguage.version,
                            book: bookToJSON
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

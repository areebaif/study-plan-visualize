import request from 'supertest';
import { returnSkillDocument } from '../../models/skills';
import { natsWrapper } from '../../nats-wrapper';
import { app } from '../../app';
import { ObjectId } from 'mongodb';

describe('add a skill functionality', () => {
    test('returns 401 if a user is not logged in', async () => {
        const data = {
            name: 'test'
        };

        return request(app).post('/api/skills/add').send(data).expect(401);
    });
    //     // TODO: remove this, only to check functionality
    //     // test('skill can only be added if a user is signed in', async () => {
    //     //     const data = {
    //     //         name: 'test'
    //     //     };

    //     //     const response = await request(app)
    //     //         .post('/api/skills/add')
    //     //         .set('Cookie', global.signin())
    //     //         .send(data);
    //     //     expect(response.status).toEqual(201);
    //     // });

    test('disallows duplicats skill name', async () => {
        // create a skill
        const data = {
            name: 'test'
        };
        const cookie = global.signin();
        await request(app)
            .post('/api/skills/add')
            .set('Cookie', cookie!)
            .send(data)
            .expect(201);

        await request(app)
            .post('/api/skills/add')
            .set('Cookie', cookie!)
            .send({
                name: 'test'
            })
            .expect(400);
    });

    test('returns 400 if no skill name provided', async () => {
        const cookie = global.signin();
        await request(app)
            .post('/api/skills/add')
            .set('Cookie', cookie!)
            .send({})
            .expect(400);
    });

    test('publishes an event', async () => {
        const data = {
            name: 'test'
        };
        const cookie = global.signin();

        await request(app)
            .post('/api/skills/add')
            .set('Cookie', cookie)
            .send(data)
            .expect(201);

        expect(natsWrapper.client.publish).toHaveBeenCalled();
    });
});

describe('get all skills functionality', () => {
    test('returns 200 when fetching all skills for a user', async () => {
        const cookie = global.signin();
        await request(app)
            .get('/api/skills/all')
            .set('Cookie', cookie)
            .expect(200);
    });

    test('retruns 401 if user is not loggedIn', async () => {
        await request(app).get('/api/skills/all').expect(401);
    });
});

describe('get a single skill by id functionality', () => {
    test('returns a 200 if a skill is found', async () => {
        // create a skill
        const testSkill = {
            name: 'test'
        };
        const cookie = global.signin();

        const response = await request(app)
            .post('/api/skills/add')
            .send(testSkill)
            .set('Cookie', cookie)
            .expect(201);

        // get a skill from database
        const { data } = response.body;
        const document: returnSkillDocument = data[0];

        const skillResponse = await request(app)
            .get(`/api/skills/${document._id}`)
            .send()
            .set('Cookie', cookie)
            .expect(200);
    });

    test('returns a 500 if the provided mongoId does not exist', async () => {
        const skillId = new ObjectId();
        const cookie = global.signin();
        await request(app)
            .get(`/api/skills/${skillId}`)
            .send()
            .set('Cookie', cookie)
            .expect(500);
    });
    test('retruns 401 if user is not loggedIn', async () => {
        const skillId = new ObjectId();
        await request(app).get(`/api/skills/${skillId}`).expect(401);
    });
});

describe('delete a skill functionality', () => {
    test('returns 202 if a skill is deleted', async () => {
        const testSkill = {
            name: 'test'
        };
        const cookie = global.signin();

        const response = await request(app)
            .post('/api/skills/add')
            .send(testSkill)
            .set('Cookie', cookie)
            .expect(201);

        const { data } = response.body;
        const document: returnSkillDocument = data[0];
        const id = document._id;
        const deleteData = {
            id: id
        };
        const skillDeleteResponse = await request(app)
            .post(`/api/skills/destroy`)
            .send(deleteData)
            .set('Cookie', cookie)
            .expect(202);
    });

    test('returns 500 if the provided mongoId does not exist', async () => {
        const mongoId = new ObjectId().toString();
        const deleteId = {
            id: mongoId
        };
        const cookie = global.signin();

        await request(app)
            .post(`/api/skills/destroy`)
            .send(deleteId)
            .set('Cookie', cookie)
            .expect(500);
    });

    test('publishes an event on succesful skill deletion', async () => {
        const testSkill = {
            name: 'test'
        };
        const cookie = global.signin();

        const response = await request(app)
            .post('/api/skills/add')
            .send(testSkill)
            .set('Cookie', cookie)
            .expect(201);

        const { data } = response.body;
        const document: returnSkillDocument = data[0];
        const id = document._id;
        const deleteData = {
            id: id
        };
        const skillDeleteResponse = await request(app)
            .post(`/api/skills/destroy`)
            .send(deleteData)
            .set('Cookie', cookie)
            .expect(202);

        expect(natsWrapper.client.publish).toHaveBeenCalled();
    });

    test('returns 401 if user is not loggedIn', async () => {
        const mongoId = new ObjectId().toString();
        const deleteId = {
            id: mongoId
        };

        await request(app)
            .post(`/api/skills/destroy`)
            .send(deleteId)
            .expect(401);
    });
    test('returns 400 if a mongoId not provided', async () => {
        const cookie = global.signin();

        await request(app)
            .post(`/api/skills/destroy`)
            .send()
            .set('Cookie', cookie)
            .expect(400);
    });
});

describe('update a skill functionality', () => {
    test('returns 500 if the provided mongoId does not exist', async () => {
        const mongoId = new ObjectId().toString();
        const deleteData = {
            id: mongoId,
            name: 'test'
        };
        const cookie = global.signin();
        await request(app)
            .post(`/api/skills/update`)
            .send(deleteData)
            .set('Cookie', cookie)
            .expect(500);
    });

    test('returns 400 if a mongoId not provided', async () => {
        const deleteData = {
            name: 'test'
        };
        const cookie = global.signin();

        await request(app)
            .post(`/api/skills/update`)
            .send(deleteData)
            .set('Cookie', cookie)
            .expect(400);
    });

    test('returns 400 if name not provided', async () => {
        const deleteData = {
            ticketId: 'testMongoObjectId'
        };
        const cookie = global.signin();

        await request(app)
            .post(`/api/skills/update`)
            .send(deleteData)
            .set('Cookie', cookie)
            .expect(400);
    });

    test('returns 400 if the new skill name provided to update skill is already in use by the user', async () => {
        // create a skill
        const testSkill = {
            name: 'test'
        };
        const cookie = global.signin();
        const response = await request(app)
            .post('/api/skills/add')
            .send(testSkill)
            .set('Cookie', cookie)
            .expect(201);

        // get a skill from database
        const { data } = response.body;
        const document: returnSkillDocument = data[0];
        const id = document._id;
        const updateData = {
            id: id,
            name: document.name
        };

        await request(app)
            .post(`/api/skills/update`)
            .send(updateData)
            .set('Cookie', cookie)
            .expect(400);
    });

    test('returns a 200 if skill is succesfully updated', async () => {
        // create a skill
        const testSkill = {
            name: 'test'
        };
        const cookie = global.signin();
        const response = await request(app)
            .post('/api/skills/add')
            .send(testSkill)
            .set('Cookie', cookie)
            .expect(201);

        // get a skill from database
        const { data } = response.body;
        const document: returnSkillDocument = data[0];

        const updateData = {
            id: document._id,
            name: 'testTwo'
        };

        await request(app)
            .post(`/api/skills/update`)
            .send(updateData)
            .set('Cookie', cookie)
            .expect(200);
    });

    test('publishes an event', async () => {
        // create a skill
        const testSkill = {
            name: 'test'
        };
        const cookie = global.signin();
        const response = await request(app)
            .post('/api/skills/add')
            .send(testSkill)
            .set('Cookie', cookie)
            .expect(201);

        // get a skill from database
        const { data } = response.body;
        const document: returnSkillDocument = data[0];

        const updateData = {
            id: document._id,
            name: 'testTwo'
        };

        await request(app)
            .post(`/api/skills/update`)
            .send(updateData)
            .set('Cookie', cookie)
            .expect(200);

        expect(natsWrapper.client.publish).toHaveBeenCalled();
    });
    test('returns 401 if user is not loggedIn', async () => {
        const mongoId = new ObjectId().toString();
        const updateId = {
            id: mongoId
        };

        await request(app)
            .post(`/api/skills/destroy`)
            .send(updateId)
            .expect(401);
    });
});

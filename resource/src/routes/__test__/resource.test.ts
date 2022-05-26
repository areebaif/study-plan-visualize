//TODO: fix this file
import request from 'supertest';
import { returnResourceDocument } from '../../models/resource';
import { natsWrapper } from '../../../nats-wrapper';

import { app } from '../../app';

// describe('add a skill functionality', () => {
//     test('returns a 201 on succesful skill creation', async () => {
//         const data = {
//             name: 'test'
//         };

//         return request(app).post('/api/skills/add').send(data).expect(201);
//     });
//     // TODO: we need userId
//     test('skill can only be added if a user is signed in', async () => {
//         const data = {
//             name: 'test'
//         };

//         return request(app).post('/api/skills/add').send(data).expect(400);
//     });

//     test('disallows duplicats skill name', async () => {
//         // create a skill
//         const data = {
//             name: 'test'
//         };
//         await request(app).post('/api/skills/add').send(data).expect(201);

//         await request(app)
//             .post('/api/skills/add')
//             .send({
//                 name: 'test'
//             })
//             .expect(400);
//     });

//     test('returns a 400 if no skill name provided', async () => {
//         await request(app).post('/api/skills/add').send({}).expect(400);
//     });

//     test('publishes an event', async () => {
//         const data = {
//             name: 'test'
//         };

//         await request(app).post('/api/skills/add').send(data).expect(201);

//         expect(natsWrapper.client.publish).toHaveBeenCalled();
//     });
// });

// describe('get all skills functionality', () => {
//     test('returns a 200 when fetching all skills', async () => {
//         const data = {
//             name: 'test'
//         };
//         await request(app).post('/api/skills/add').send(data).expect(201);

//         await request(app).get('/api/skills/all').expect(200);
//     });
// });

// describe('get a single skill by id functionality', () => {
//     test('returns a 200 if a skill is found', async () => {
//         // create a skill
//         const testSkill = {
//             name: 'test'
//         };
//         const response = await request(app)
//             .post('/api/skills/add')
//             .send(testSkill)
//             .expect(201);

//         // get a skill from database
//         const { data } = response.body;
//         const document: returnResourceDocument = data[0];

//         const skillResponse = await request(app)
//             .get(`/api/skills/${document._id}`)
//             .send()
//             .expect(200);
//     });

//     test('returns a 400 if the provided mongoId does not exist', async () => {
//         const skillId = 'testMongoObjectId';

//         await request(app).get(`/api/skills/${skillId}`).send().expect(400);
//     });
// });

// describe('delete a skill functionality', () => {
//     test('returns a 202 if a skill is deleted', async () => {
//         const testSkill = {
//             name: 'test'
//         };

//         const response = await request(app)
//             .post('/api/skills/add')
//             .send(testSkill)
//             .expect(201);

//         const { data } = response.body;
//         const document: returnResourceDocument = data[0];
//         const id = document._id;
//         const deleteData = {
//             id: id
//         };
//         const skillDeleteResponse = await request(app)
//             .post(`/api/skills/destroy`)
//             .send(deleteData)
//             .expect(202);
//     });

//     test('returns a 400 if the provided mongoId does not exist', async () => {
//         const deleteId = {
//             id: 'testMongoObjectId'
//         };

//         await request(app)
//             .post(`/api/skills/destroy`)
//             .send(deleteId)
//             .expect(400);
//     });
//     test('publishes an event', async () => {
//         const testSkill = {
//             name: 'test'
//         };

//         const response = await request(app)
//             .post('/api/skills/add')
//             .send(testSkill)
//             .expect(201);

//         const { data } = response.body;
//         const document: returnResourceDocument = data[0];
//         const id = document._id;
//         const deleteData = {
//             id: id
//         };
//         const skillDeleteResponse = await request(app)
//             .post(`/api/skills/destroy`)
//             .send(deleteData)
//             .expect(202);

//         expect(natsWrapper.client.publish).toHaveBeenCalled();
//     });
// });

// describe('update a skill functionality', () => {
//     test('returns a 400 if the provided mongoId does not exist', async () => {
//         const fakeData = {
//             ticketId: 'testMongoObjectId',
//             name: 'test'
//         };

//         await request(app)
//             .post(`/api/skills/update`)
//             .send(fakeData)
//             .expect(400);
//     });

//     test('returns a 400 if mongoId not provided', async () => {
//         const fakeData = {
//             name: 'test'
//         };

//         await request(app)
//             .post(`/api/skills/update`)
//             .send(fakeData)
//             .expect(400);
//     });

//     test('returns a 400 if name not provided', async () => {
//         const fakeData = {
//             ticketId: 'testMongoObjectId'
//         };

//         await request(app)
//             .post(`/api/skills/update`)
//             .send(fakeData)
//             .expect(400);
//     });

//     test('returns a 400 if the new skill name provided to update skill is already in use', async () => {
//         // create a skill
//         const testSkill = {
//             name: 'test'
//         };
//         const response = await request(app)
//             .post('/api/skills/add')
//             .send(testSkill)
//             .expect(201);

//         // get a skill from database
//         const { data } = response.body;
//         const document: returnResourceDocument = data[0];
//         const id = document._id;
//         const updateData = {
//             id: id,
//             name: document.name
//         };

//         await request(app)
//             .post(`/api/skills/update`)
//             .send(updateData)
//             .expect(400);
//     });

//     test('returns a 200 if skill is succesfully updated', async () => {
//         // create a skill
//         const testSkill = {
//             name: 'test'
//         };
//         const response = await request(app)
//             .post('/api/skills/add')
//             .send(testSkill)
//             .expect(201);

//         // get a skill from database
//         const { data } = response.body;
//         const document: returnResourceDocument = data[0];

//         const updateData = {
//             id: document._id,
//             name: 'testTwo'
//         };

//         await request(app)
//             .post(`/api/skills/update`)
//             .send(updateData)
//             .expect(200);
//     });

//     test('publishes an event', async () => {
//         // create a skill
//         const testSkill = {
//             name: 'test'
//         };
//         const response = await request(app)
//             .post('/api/skills/add')
//             .send(testSkill)
//             .expect(201);

//         // get a skill from database
//         const { data } = response.body;
//         const document: returnResourceDocument = data[0];

//         const updateData = {
//             id: document._id,
//             name: 'testTwo'
//         };

//         await request(app)
//             .post(`/api/skills/update`)
//             .send(updateData)
//             .expect(200);

//         expect(natsWrapper.client.publish).toHaveBeenCalled();
//     });
// });

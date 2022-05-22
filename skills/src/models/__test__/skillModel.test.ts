import { Skills } from '../skills';
import { ObjectId } from 'mongodb';
import { skillActiveStatus } from '@ai-common-modules/events';

describe('test functionality around skills model and database', () => {
    test('implements optimistic concurrency control', async () => {
        // create an instance of a skill
        const userId = new ObjectId();
        const data = {
            name: 'test',
            userId: userId,
            version: 1,
            dbStatus: skillActiveStatus.active
        };
        // save it to the database
        const skillDoc = await Skills.insertSkill(data);

        // fetch the skill twice
        const firstInstance = await Skills.getSkillById(skillDoc._id);
        const secondInstance = await Skills.getSkillById(skillDoc._id);

        const updateFirstInstanceData = {
            _id: firstInstance._id,
            userId: userId,
            name: 'testTwo',
            version: firstInstance.version! + 1
        };
        const updateSecondInstance = {
            _id: firstInstance._id,
            userId: userId,
            name: 'testThree',
            version: firstInstance.version!
        };

        const result = await Skills.updateSkillName(updateFirstInstanceData);
        expect(result).toEqual(true);

        try {
            await Skills.updateSkillName(updateFirstInstanceData);
        } catch (err) {
            // we are expecting an error hence we are returning after error thrwon in this catch block
            return;
        }
        //you code should not hit this error statement
        throw new Error('this error should not be thrown');
    });
});

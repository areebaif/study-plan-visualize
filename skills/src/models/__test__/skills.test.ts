import { Skills, databaseStatus } from '../skills';

describe('test functionality around skills model and database', () => {
    test('implements optimistic concurrency control', async () => {
        // create an instance of a skill
        const data = {
            name: 'test',
            version: 1,
            dbStatus: databaseStatus.active
        };
        // save it to the database
        const skillDoc = await Skills.insertSkill({
            name: data.name,
            version: data.version,
            dbStatus: data.dbStatus
        });

        // fetch the skill twice
        const firstInstance = await Skills.getSkillById(skillDoc._id);
        const secondInstance = await Skills.getSkillById(skillDoc._id);

        const updateFirstInstanceData = {
            _id: firstInstance._id,
            name: 'testTwo',
            version: firstInstance.version! + 1
        };
        const updateSecondInstance = {
            _id: firstInstance._id,
            name: 'testThree',
            version: firstInstance.version!
        };

        await Skills.updateSkillName(updateFirstInstanceData);
        try {
            await Skills.updateSkillName(updateFirstInstanceData);
        } catch (err) {
            return;
        }

        throw new Error('this error should not be thrown');
        // make two separate changes to the ticket
        //save the first fetched ticket
        // save the second fetch ticket and expect an error
    });
});

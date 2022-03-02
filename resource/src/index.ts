// environemnt variables defined in kubernetes deployments
import 'dotenv/config.js';

// inside module imports
import { app } from './app';
import { natsWrapper } from '../nats-wrapper';
import {
    SkillCreatedListner,
    SkillUpdatedListner,
    skillDeletedListener
} from './events/listeners';
import { connectDb } from './services/mongodb';
import { Express } from 'express';

const PORT = process.env.PORT || 7000;

const startServer = async (app: Express) => {
    try {
        // check if environment variable exists
        if (
            !process.env.MONGO_DB_CONNECTION_STRING ||
            !process.env.NATS_URL ||
            !process.env.NATS_CLUSTER_ID ||
            !process.env.NATS_CLIENT_ID ||
            !process.env.JWT ||
            !process.env.NODE_ENV
        )
            throw new Error('environment variable not defined');
        console.log(process.env.NATS_CLIENT_ID);

        // connect to nats
        // the second argument clientId needs to be unique for every copy of this service you spinup in kubernetes
        await natsWrapper.connect(
            process.env.NATS_CLUSTER_ID,
            process.env.NATS_CLIENT_ID,
            process.env.NATS_URL
        );
        // gracefully shutdown nats if nats try to close
        natsWrapper.client.on('close', () => {
            console.log('nats connection closed');
            process.exit();
        });

        process.on('SIGINT', () => natsWrapper.client.close());
        process.on('SIGTERM', () => natsWrapper.client.close());

        // listen for events from other services
        new SkillCreatedListner(natsWrapper.client).listen();
        new SkillUpdatedListner(natsWrapper.client).listen();
        new skillDeletedListener(natsWrapper.client).listen();

        // connect to db
        await connectDb();

        //listen on port
        app.listen(PORT, () => {
            console.log(`course service running on ${PORT}`);
        });
    } catch (err) {
        console.log(err);
    }
};

startServer(app);

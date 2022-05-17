import express from 'express';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import cookieSession from 'cookie-session';
import swaggerJSDoc from 'swagger-jsdoc';

import { skillRouter } from './routes/skills';
import { errorHandler } from './middlewares/errorHandler';
import swaggerDocument from './swagger/skill-api.json';

const app = express();
app.set('trust proxy', true);

app.use(
    cookieSession({
        signed: false,
        name: 'session',
        secure: process.env.NODE_ENV === 'production'
    })
);

//middleware
app.use(bodyParser.json());

//api-documentation
app.use(
    '/api/skills/skill-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);
app.use(skillRouter);

// error-handler
app.use(errorHandler);

export { app };

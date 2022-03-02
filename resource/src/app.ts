import express from 'express';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import cookieSession from 'cookie-session';
import { resourceRouter } from './routes/resource';
import { errorHandler } from './middlewares/errorHandler';
import swaggerDocument from './swagger/course-api.json';

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

// api-documentation
app.use(
    '/api/course/course-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);
app.use(resourceRouter);

// error-handler
app.use(errorHandler);

export { app };

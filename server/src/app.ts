import dotenv from 'dotenv';
dotenv.config();

import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import buildingsRouter from './routes/buildings';
import blueprintsRouter from './routes/blueprints';
import usersRouter from './routes/users';
import * as swaggerDocument from '../swagger.json';
import passport from './config/passport';

const app: Application = express();

// Session middleware (required for passport)
app.use(
    session({
        secret: process.env.AUTH0_SECRET as string,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
        },
    })
);

app.use(
    cors({
        origin: process.env.WEB_URL,
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the data directory
app.use('/conduit_images', express.static(path.join(__dirname, '../../data/conduit_images')));
app.use('/ui_images', express.static(path.join(__dirname, '../../data/ui_images')));
app.use('/draw_images', express.static(path.join(__dirname, '../../data/building_uv')));

app.use('/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API endpoints
app.use('/api/buildings', buildingsRouter);
app.use('/api/blueprints', blueprintsRouter);
app.use('/api/users', usersRouter);

export default app;

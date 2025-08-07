import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import buildingsRouter from './routes/buildings';
import * as swaggerDocument from '../swagger.json';

const app: Application = express();

app.use(cors());
app.use(express.json());

// Serve static files from the data directory
app.use('/images', express.static(path.join(__dirname, '../../data/extract_uv')));

app.use('/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API endpoints
app.use('/api/buildings', buildingsRouter);

export default app;

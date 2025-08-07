const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Construction ONI API',
        description: 'API for ONI Buildings',
        version: '1.0.0',
    },
    host: 'localhost:3003',
    basePath: '/',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    definitions: {
        Building: {
            id: 'string',
            name: 'string',
            category: 'string',
            subcategory: 'string',
            size: {},
            materials: {},
            properties: {},
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
    },
};

const outputFile = './swagger.json';
const routes = ['./src/app.ts', './src/routes/*.ts'];

swaggerAutogen(outputFile, routes, doc);

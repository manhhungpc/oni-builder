import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const router: Router = Router();
const prisma = new PrismaClient();

function generateShareId(): string {
    return randomBytes(6).toString('base64url');
}

router.post(
    '/',
    // #swagger.path = '/api/blueprints'
    // #swagger.description = 'Create a new blueprint'
    // #swagger.responses[201] = { description: 'Blueprint created successfully' }
    // #swagger.responses[400] = { description: 'Bad request - invalid data' }
    async (req: Request, res: Response) => {
        try {
            const { name, buildings, connections } = req.body;

            if (!name || !buildings) {
                return res.status(400).json({
                    error: 'Missing required fields: name, buildings are required',
                });
            }

            const blueprint = await prisma.blueprint.create({
                data: {
                    shareId: generateShareId(),
                    name,
                    buildings,
                    connections: connections || null,
                },
                select: {
                    id: true,
                    shareId: true,
                    name: true,
                    createdAt: true,
                },
            });

            res.status(201).json({
                success: true,
                data: {
                    id: blueprint.id,
                    shareId: blueprint.shareId,
                    name: blueprint.name,
                    createdAt: blueprint.createdAt,
                },
            });
        } catch (error) {
            console.error('Error creating blueprint:', error);
            res.status(500).json({
                error: 'Failed to create blueprint',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

router.get(
    '/:shareId',
    // #swagger.path = '/api/blueprints/{shareId}'
    // #swagger.description = 'Get blueprint by share ID'
    // #swagger.parameters['shareId'] = { description: 'Share ID of the blueprint' }
    // #swagger.responses[200] = { description: 'Blueprint data' }
    // #swagger.responses[404] = { description: 'Blueprint not found' }
    async (req: Request, res: Response) => {
        try {
            const { shareId } = req.params;

            if (!shareId) {
                return res.status(400).json({
                    error: 'Share ID is required',
                });
            }

            const blueprint = await prisma.blueprint.findUnique({
                where: {
                    shareId,
                },
            });

            if (!blueprint) {
                return res.status(404).json({
                    error: 'Blueprint not found',
                });
            }

            // Increment view count
            await prisma.blueprint.update({
                where: {
                    shareId,
                },
                data: {
                    viewCount: {
                        increment: 1,
                    },
                },
            });

            res.json({
                success: true,
                data: {
                    id: blueprint.id,
                    shareId: blueprint.shareId,
                    name: blueprint.name,
                    buildings: blueprint.buildings,
                    connections: blueprint.connections,
                    createdAt: blueprint.createdAt,
                    updatedAt: blueprint.updatedAt,
                    viewCount: blueprint.viewCount + 1,
                },
            });
        } catch (error) {
            console.error('Error fetching blueprint:', error);
            res.status(500).json({
                error: 'Failed to fetch blueprint',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

export default router;

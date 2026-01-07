import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { authenticateToken, optionalAuth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/asyncHandler';

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
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const { name, buildings, connections, guestId } = req.body;
        const userId = (req as any).user?.userId || null;

        if (!name || !buildings) {
            return res.status(400).json({
                error: 'Missing required fields: name, buildings are required',
            });
        }

        if (!userId && !guestId) {
            return res.status(400).json({
                error: "Can't create blueprint with no owner",
            });
        }

        const blueprint = await prisma.blueprint.create({
            data: {
                shareId: generateShareId(),
                name,
                buildings,
                connections: connections || null,
                userId,
                guestId: userId ? null : guestId || null,
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
    })
);

router.post(
    '/migrate',
    // #swagger.path = '/api/blueprints/migrate'
    // #swagger.description = 'Migrate guest blueprints to authenticated user'
    // #swagger.responses[200] = { description: 'Migration successful' }
    // #swagger.responses[401] = { description: 'Not authenticated' }
    authenticateToken,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user.userId;
        const { guestId } = req.body;

        if (!guestId) {
            return res.status(400).json({
                error: 'guestId is required',
            });
        }

        const result = await prisma.blueprint.updateMany({
            where: {
                guestId: guestId,
                userId: null,
            },
            data: {
                userId: userId,
                guestId: null,
            },
        });

        res.json({
            success: true,
            data: {
                migratedCount: result.count,
            },
        });
    })
);

router.get(
    '/my-collection',
    // #swagger.path = '/api/blueprints/my-collection'
    // #swagger.description = 'Get my blueprints'
    // #swagger.parameters['page'] = { description: 'Page number (default: 1)' }
    // #swagger.parameters['limit'] = { description: 'Items per page (default: 10)' }
    // #swagger.responses[200] = { description: 'List of user blueprints' }
    // #swagger.responses[401] = { description: 'Not authenticated' }
    authenticateToken,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user.userId;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
        const skip = (page - 1) * limit;

        const [blueprints, total] = await Promise.all([
            prisma.blueprint.findMany({
                where: {
                    userId,
                },
                select: {
                    id: true,
                    shareId: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: {
                    updatedAt: 'desc',
                },
                skip,
                take: limit,
            }),
            prisma.blueprint.count({
                where: {
                    userId,
                },
            }),
        ]);

        res.json({
            success: true,
            data: blueprints,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    })
);

router.put(
    '/:shareId',
    // #swagger.path = '/api/blueprints/{shareId}'
    // #swagger.description = 'Update blueprint by share ID'
    // #swagger.parameters['shareId'] = { description: 'Share ID of the blueprint' }
    // #swagger.responses[200] = { description: 'Blueprint updated successfully' }
    // #swagger.responses[401] = { description: 'Not authenticated' }
    // #swagger.responses[403] = { description: 'Not authorized to update this blueprint' }
    // #swagger.responses[404] = { description: 'Blueprint not found' }
    authenticateToken,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user.userId;
        const { shareId } = req.params;
        const { name } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                error: 'Name is required',
            });
        }

        const blueprint = await prisma.blueprint.findUnique({
            where: { shareId },
            select: { userId: true },
        });

        if (!blueprint) {
            return res.status(404).json({
                error: 'Blueprint not found',
            });
        }

        if (blueprint.userId !== userId) {
            return res.status(403).json({
                error: 'Not authorized to update this blueprint',
            });
        }

        const updated = await prisma.blueprint.update({
            where: { shareId },
            data: { name: name.trim() },
            select: {
                id: true,
                shareId: true,
                name: true,
                updatedAt: true,
            },
        });

        res.json({
            success: true,
            data: updated,
        });
    })
);

router.get(
    '/:shareId',
    // #swagger.path = '/api/blueprints/{shareId}'
    // #swagger.description = 'Get blueprint by share ID'
    // #swagger.parameters['shareId'] = { description: 'Share ID of the blueprint' }
    // #swagger.responses[200] = { description: 'Blueprint data' }
    // #swagger.responses[404] = { description: 'Blueprint not found' }
    asyncHandler(async (req: Request, res: Response) => {
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
            },
        });
    })
);

export default router;

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middlewares/asyncHandler';

const router: Router = Router();
const prisma = new PrismaClient();

router.get(
    '/',
    // #swagger.path = '/api/elements'
    // #swagger.responses[200] = { description: 'List of elements' }
    asyncHandler(async (req: Request, res: Response) => {
        const { type, search } = req.query;

        const where: any = {};

        if (type) {
            where.type = type as string;
        }

        if (search) {
            where.name = {
                contains: search as string,
                mode: 'insensitive',
            };
        }

        const elements = await prisma.element.findMany({
            where,
            orderBy: { name: 'asc' },
        });

        res.json(elements);
    })
);

export default router;

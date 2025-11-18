import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { QueryBuildings } from '@shared/interface';

const router: Router = Router();
const prisma = new PrismaClient();

router.get(
    '/',
    // #swagger.path = '/api/buildings'
    // #swagger.responses[200] = { description: 'List of buildings' }
    async (req: Request, res: Response) => {
        try {
            const { category, search } = req.query;

            // Build filter object for PostgreSQL
            const where: any = {};

            if (category) {
                where.category = category as string;
            }

            if (search) {
                // PostgreSQL: Use OR conditions with array contains and case-insensitive text search
                where.OR = [
                    {
                        search_term: {
                            hasSome: [search as string], // Array contains any of these values
                        },
                    },
                    {
                        display_name: {
                            contains: search as string,
                            mode: 'insensitive',
                        },
                    },
                    {
                        name: {
                            contains: search as string,
                            mode: 'insensitive',
                        },
                    },
                ];
            }

            const buildings = await prisma.building.findMany({
                where,
                orderBy: { display_name: 'asc' },
            });

            res.json(buildings);
        } catch (error) {
            console.error('Error fetching buildings:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;

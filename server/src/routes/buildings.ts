import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { normalizeData } from '../utils/normalizeData';
import type { QueryBuildings } from '@shared/interface';

const router = Router();
const prisma = new PrismaClient();

router.get(
    '/',
    // #swagger.path = '/api/buildings'
    // #swagger.responses[200] = { description: 'List of buildings' }
    async (req: Request, res: Response) => {
        try {
            const { category, search } = req.query;

            // Build filter object
            const filter: any = {};

            if (category) {
                filter.category = category as string;
            }

            if (search) {
                filter.$or = [
                    { search_term: { $elemMatch: { $regex: search as string, $options: 'i' } } },
                    { display_name: { $regex: search as string, $options: 'i' } },
                ];
            }

            // Use findRaw when search is present (for regex support), otherwise use findMany
            const buildings = search
                ? await prisma.building.findRaw({
                      filter,
                      options: { sort: { display_name: 1 } },
                  })
                : await prisma.building.findMany({
                      where: filter,
                      orderBy: { display_name: 'asc' },
                  });

            // Normalize MongoDB data format
            const formatBuildingsData = normalizeData(buildings);

            res.json(formatBuildingsData);
        } catch (error) {
            console.error('Error fetching buildings:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;

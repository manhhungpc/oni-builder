import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import passport from '../config/passport';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middlewares/auth';
import { AuthenticateOptions } from 'passport';

interface Auth0AuthenticateOptions extends AuthenticateOptions {
    connection?: string;
}

const router: Router = Router();
const prisma = new PrismaClient();

router.get(
    '/auth/login',
    passport.authenticate('auth0', {
        scope: 'openid email profile',
        connection: 'google-oauth2',
    } as Auth0AuthenticateOptions)
);

router.get(
    '/auth/callback',
    passport.authenticate('auth0'),
    async (req: Request, res: Response) => {
        try {
            const user = req.user as any;

            if (!user) {
                return res.status(401).json({ error: 'Not authorize' });
            }

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                },
                String(process.env.JWT_SECRET),
                { expiresIn: '7d' }
            );
            console.log('🐧 ~ token:', token);

            res.cookie('jwt_esb', token, {
                httpOnly: true,
                // secure: true, // Required for ngrok (HTTPS)
                // sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.redirect(String(process.env.WEB_URL));
        } catch (error) {
            console.error('Error processing auth callback:', error);
            res.status(500).json({ error: 'Failed to authenticate' });
        }
    }
);

router.get(
    '/me',
    // #swagger.path = '/api/users/me'
    // #swagger.description = 'Get current authenticated user'
    // #swagger.responses[200] = { description: 'User data' }
    // #swagger.responses[401] = { description: 'Not authenticated' }
    authenticateToken,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.userId;
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;

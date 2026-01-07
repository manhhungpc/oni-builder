import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const authenticateToken = (req: Request, res: Response, next: Function) => {
    const token = req.cookies.jwt_esb;

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Optional authentication - extracts userId if JWT present, but doesn't require it
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.jwt_esb;

    if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
    }

    next();
};

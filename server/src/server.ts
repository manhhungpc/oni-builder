import dotenv from 'dotenv';
import app from './app';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

async function main() {
    try {
        await prisma.$connect();
        console.log('Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Swagger docs available at http://localhost:${PORT}/documentation`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

import passport from 'passport';
import { Strategy as Auth0Strategy } from 'passport-auth0';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

passport.use(
    new Auth0Strategy(
        {
            domain: process.env.AUTH0_DOMAIN as string,
            clientID: process.env.AUTH0_CLIENT_ID as string,
            clientSecret: process.env.AUTH0_CLIENT_SECRET as string,
            callbackURL: 'http://localhost:3003/api/users/auth/callback',
        },
        async (accessToken, refreshToken, extraParams, profile, done) => {
            try {
                // Upsert user in database
                const user = await prisma.user.upsert({
                    where: { email: profile.emails?.[0]?.value },
                    update: {
                        name: profile.displayName,
                        avatar: profile.photos?.[0]?.value,
                    },
                    create: {
                        email: profile.emails?.[0]?.value as string,
                        name: profile.displayName,
                        avatar: profile.photos?.[0]?.value,
                    },
                });

                done(null, user);
            } catch (error) {
                done(error as Error, undefined);
            }
        }
    )
);

export default passport;

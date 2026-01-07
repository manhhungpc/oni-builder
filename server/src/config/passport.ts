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
                // Auth0 may return avatar in different locations depending on the connection
                const avatar =
                    (profile as any).picture ||
                    (profile as any)._json?.picture ||
                    profile.photos?.[0]?.value ||
                    null;

                // Upsert user in database
                const user = await prisma.user.upsert({
                    where: { email: profile.emails?.[0]?.value },
                    update: {
                        name: profile.displayName,
                        avatar,
                    },
                    create: {
                        email: profile.emails?.[0]?.value as string,
                        name: profile.displayName,
                        avatar,
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

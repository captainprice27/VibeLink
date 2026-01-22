import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please enter email and password');
                }

                await connectDB();

                const user = await User.findOne({ email: credentials.email.toLowerCase() });

                if (!user) {
                    throw new Error('No user found with this email');
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error('Invalid password');
                }

                // Update online status
                await User.findByIdAndUpdate(user._id, {
                    isOnline: true,
                    lastSeen: new Date(),
                });

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    image: user.avatar,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
            }
            // Explicitly remove large/redundant fields from token to keep cookie small
            if (token.picture) delete token.picture;
            if (token.name) delete token.name;
            if (token.email) delete token.email;

            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                (session.user as { id: string }).id = token.id as string;
                try {
                    await connectDB();
                    const dbUser = await User.findById(token.id).select('name email avatar isAgent personality');
                    if (dbUser) {
                        session.user.name = dbUser.name;
                        session.user.email = dbUser.email;
                        session.user.image = dbUser.avatar;
                        (session.user as any).isAgent = dbUser.isAgent;
                        (session.user as any).personality = dbUser.personality;
                    }
                } catch (error) {
                    console.error("Error fetching user data for session:", error);
                }
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
};

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { agentProfiles } from '@/lib/agents';
import bcrypt from 'bcryptjs';

// GET /api/users - Get all users (real users + agents)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Get real users except the current user
        const realUsers = await User.find({
            _id: { $ne: (session.user as { id: string }).id },
            isAgent: false,
        })
            .select('_id name email avatar isOnline lastSeen isAgent')
            .lean()
            .exec();

        // Get agents from database or create them if not exist
        let agents = await User.find({ isAgent: true })
            .select('_id name email avatar isOnline lastSeen isAgent personality')
            .lean()
            .exec();

        // If no agents exist, create them
        if (agents.length === 0) {
            const hashedPassword = await bcrypt.hash('agent-password', 12);

            for (const profile of agentProfiles) {
                await User.create({
                    email: profile.email,
                    password: hashedPassword,
                    name: profile.name,
                    isAgent: true,
                    personality: profile.personality,
                    isOnline: true,
                    lastSeen: new Date(),
                });
            }

            agents = await User.find({ isAgent: true })
                .select('_id name email avatar isOnline lastSeen isAgent personality')
                .lean()
                .exec();
        }

        // Format response - use explicit any to handle mongoose lean result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedUsers = [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...agents.map((agent: any) => ({
                id: String(agent._id),
                name: agent.name,
                email: agent.email,
                avatar: agent.avatar || null,
                isOnline: true, // Agents are always online
                lastSeen: agent.lastSeen,
                isAgent: true,
                personality: agent.personality,
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...realUsers.map((user: any) => ({
                id: String(user._id),
                name: user.name,
                email: user.email,
                avatar: user.avatar || null,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
                isAgent: false,
            })),
        ];

        return NextResponse.json({ users: formattedUsers });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/users - Update current user's profile or status
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, avatar, location, deviceInfo, isOnline } = body;

        await connectDB();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (location !== undefined) updateData.location = location;
        if (deviceInfo !== undefined) updateData.deviceInfo = deviceInfo;
        if (isOnline !== undefined) {
            updateData.isOnline = isOnline;
            updateData.lastSeen = new Date();
        }

        const user = await User.findByIdAndUpdate(
            (session.user as { id: string }).id,
            updateData,
            { new: true }
        )
            .select('_id name email avatar isOnline lastSeen')
            .lean()
            .exec();

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

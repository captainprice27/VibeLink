import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { avatar } = await request.json();
        const userId = (session.user as { id: string }).id;

        // Basic validation for base64 image (if provided)
        if (avatar && !avatar.startsWith('data:image/')) {
            return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
        }

        await connectDB();

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { avatar },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: updatedUser._id.toString(),
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar,
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

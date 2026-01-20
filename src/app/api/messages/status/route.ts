import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import mongoose from 'mongoose';

// PATCH /api/messages/status - Batch update message statuses
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { messageIds, status } = body;

        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return NextResponse.json({ error: 'Message IDs required' }, { status: 400 });
        }

        if (!['sent', 'delivered', 'seen'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        await connectDB();

        const userId = new mongoose.Types.ObjectId((session.user as { id: string }).id);
        const objectIds = messageIds.map((id) => new mongoose.Types.ObjectId(id));

        const updateData: Record<string, unknown> = { status };

        if (status === 'seen') {
            updateData.$addToSet = {
                seenBy: { userId, seenAt: new Date() }
            };
        }

        await Message.updateMany(
            {
                _id: { $in: objectIds },
                senderId: { $ne: userId } // Only update messages not sent by current user
            },
            updateData
        );

        return NextResponse.json({ success: true, updated: messageIds.length });
    } catch (error) {
        console.error('Update message status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

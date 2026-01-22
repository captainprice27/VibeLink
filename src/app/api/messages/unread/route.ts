import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const userId = new mongoose.Types.ObjectId((session.user as { id: string }).id);

        // Find all conversations user is part of
        const conversations = await Conversation.find({
            participants: userId,
        });

        const conversationIds = conversations.map(c => c._id);

        // Count messages in these conversations that:
        // 1. Are NOT sent by the current user
        // 2. Are NOT in the seenBy array for the current user
        const unreadCount = await Message.countDocuments({
            conversationId: { $in: conversationIds },
            senderId: { $ne: userId },
            'seenBy.userId': { $ne: userId },
        });

        return NextResponse.json({ count: unreadCount });
    } catch (error) {
        console.error('Get unread count error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

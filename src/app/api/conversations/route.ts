import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import User from '@/models/User';
import mongoose from 'mongoose';

// GET /api/conversations - Get all conversations for current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const userId = new mongoose.Types.ObjectId((session.user as { id: string }).id);

        const conversations = await Conversation.aggregate([
            { $match: { participants: userId } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participantDetails',
                },
            },
            {
                $lookup: {
                    from: 'messages',
                    localField: 'lastMessage',
                    foreignField: '_id',
                    as: 'lastMessageDetails',
                },
            },
            {
                $addFields: {
                    otherParticipant: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$participantDetails',
                                    as: 'p',
                                    cond: { $ne: ['$$p._id', userId] },
                                },
                            },
                            0,
                        ],
                    },
                    lastMessageData: { $arrayElemAt: ['$lastMessageDetails', 0] },
                },
            },
            {
                $project: {
                    id: '$_id',
                    _id: 0,
                    otherParticipant: {
                        id: '$otherParticipant._id',
                        name: '$otherParticipant.name',
                        avatar: '$otherParticipant.avatar',
                        isAgent: '$otherParticipant.isAgent',
                        isOnline: '$otherParticipant.isOnline',
                        personality: '$otherParticipant.personality',
                    },
                    lastMessage: {
                        content: '$lastMessageData.content',
                        createdAt: '$lastMessageData.createdAt',
                        senderId: '$lastMessageData.senderId',
                    },
                    lastMessageAt: 1,
                    updatedAt: 1,
                },
            },
            { $sort: { lastMessageAt: -1, updatedAt: -1 } },
        ]);

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error('Get conversations error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/conversations - Create or get existing conversation
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { participantId } = body;

        if (!participantId) {
            return NextResponse.json({ error: 'Participant ID required' }, { status: 400 });
        }

        await connectDB();

        const currentUserId = new mongoose.Types.ObjectId((session.user as { id: string }).id);
        const otherUserId = new mongoose.Types.ObjectId(participantId);

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, otherUserId] },
        });

        if (!conversation) {
            // Create new conversation
            conversation = await Conversation.create({
                participants: [currentUserId, otherUserId],
            });
        }

        // Get other participant details
        const otherUser = await User.findById(otherUserId).select(
            '_id name avatar isAgent isOnline personality'
        );

        return NextResponse.json({
            conversation: {
                id: conversation._id.toString(),
                otherParticipant: {
                    id: otherUser?._id.toString(),
                    name: otherUser?.name,
                    avatar: otherUser?.avatar,
                    isAgent: otherUser?.isAgent,
                    isOnline: otherUser?.isOnline,
                    personality: otherUser?.personality,
                },
            },
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

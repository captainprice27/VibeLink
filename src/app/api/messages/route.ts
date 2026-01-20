import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import User from '@/models/User';
import { generateAgentResponse } from '@/lib/agents';
import mongoose from 'mongoose';

// GET /api/messages?conversationId=xxx - Get messages for a conversation
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversationId');

        if (!conversationId) {
            return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
        }

        await connectDB();

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: (session.user as { id: string }).id,
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const messages = await Message.aggregate([
            { $match: { conversationId: new mongoose.Types.ObjectId(conversationId) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'senderId',
                    foreignField: '_id',
                    as: 'senderDetails',
                },
            },
            {
                $addFields: {
                    sender: { $arrayElemAt: ['$senderDetails', 0] },
                },
            },
            {
                $project: {
                    id: '$_id',
                    _id: 0,
                    content: 1,
                    status: 1,
                    createdAt: 1,
                    senderId: 1,
                    sender: {
                        id: '$sender._id',
                        name: '$sender.name',
                        avatar: '$sender.avatar',
                        isAgent: '$sender.isAgent',
                    },
                },
            },
            { $sort: { createdAt: 1 } },
        ]);

        // Mark messages as seen by current user
        const userId = new mongoose.Types.ObjectId((session.user as { id: string }).id);
        await Message.updateMany(
            {
                conversationId: new mongoose.Types.ObjectId(conversationId),
                senderId: { $ne: userId },
                'seenBy.userId': { $ne: userId },
            },
            {
                $push: { seenBy: { userId, seenAt: new Date() } },
                $set: { status: 'seen' },
            }
        );

        return NextResponse.json({ messages });
    } catch (error) {
        console.error('Get messages error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/messages - Send a new message
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { conversationId, content } = body;

        if (!conversationId || !content) {
            return NextResponse.json(
                { error: 'Conversation ID and content required' },
                { status: 400 }
            );
        }

        await connectDB();

        const userId = new mongoose.Types.ObjectId((session.user as { id: string }).id);

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Create user message
        const message = await Message.create({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            senderId: userId,
            content,
            status: 'sent',
        });

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            lastMessageAt: new Date(),
        });

        // Get sender details
        const sender = await User.findById(userId).select('_id name avatar isAgent');

        const userMessage = {
            id: message._id.toString(),
            content: message.content,
            status: message.status,
            createdAt: message.createdAt,
            senderId: userId.toString(),
            sender: {
                id: sender?._id.toString(),
                name: sender?.name,
                avatar: sender?.avatar,
                isAgent: false,
            },
        };

        // Check if the other participant is an agent
        const otherParticipantId = conversation.participants.find(
            (p: mongoose.Types.ObjectId) => p.toString() !== userId.toString()
        );
        const otherParticipant = await User.findById(otherParticipantId);

        let agentMessage = null;

        if (otherParticipant?.isAgent) {
            // Generate agent response
            const agentName = otherParticipant.name.toLowerCase();
            const responseContent = generateAgentResponse(agentName, content);

            // Simulate typing delay (1-3 seconds)
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

            const agentResponse = await Message.create({
                conversationId: new mongoose.Types.ObjectId(conversationId),
                senderId: otherParticipantId,
                content: responseContent,
                status: 'sent',
            });

            // Update conversation's last message
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: agentResponse._id,
                lastMessageAt: new Date(),
            });

            agentMessage = {
                id: agentResponse._id.toString(),
                content: agentResponse.content,
                status: agentResponse.status,
                createdAt: agentResponse.createdAt,
                senderId: otherParticipantId?.toString(),
                sender: {
                    id: otherParticipant._id.toString(),
                    name: otherParticipant.name,
                    avatar: otherParticipant.avatar,
                    isAgent: true,
                },
            };
        }

        return NextResponse.json({
            message: userMessage,
            agentMessage,
        });
    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/messages - Update message status
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { messageId, status } = body;

        if (!messageId || !status) {
            return NextResponse.json({ error: 'Message ID and status required' }, { status: 400 });
        }

        await connectDB();

        const userId = new mongoose.Types.ObjectId((session.user as { id: string }).id);

        const updateData: Record<string, unknown> = { status };

        if (status === 'seen') {
            updateData.$push = { seenBy: { userId, seenAt: new Date() } };
        }

        await Message.findByIdAndUpdate(messageId, updateData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update message error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

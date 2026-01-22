import mongoose, { Schema, Document, Model } from 'mongoose';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

export interface ISeenBy {
    usedId: mongoose.Types.ObjectId;
    seenAt: Date;
}

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    content: string;
    status: MessageStatus;
    seenBy: ISeenBy[];
    image?: {
        data: string; // base64 encoded image
        mimeType: string; // image/png, image/jpeg, etc.
        size: number; // size in bytes
    };
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
            index: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: false,
        },
        image: {
            data: String,
            mimeType: String,
            size: Number,
        },
        status: {
            type: String,
            enum: ['sending', 'sent', 'delivered', 'seen'],
            default: 'sent',
        },
        seenBy: [
            {
                userId: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
                seenAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Index for efficient message queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;

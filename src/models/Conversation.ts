import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConversation extends Document {
    _id: mongoose.Types.ObjectId;
    participants: mongoose.Types.ObjectId[];
    lastMessage?: mongoose.Types.ObjectId;
    lastMessageAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        ],
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        lastMessageAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Index for finding conversations by participant
ConversationSchema.index({ participants: 1 });

const Conversation: Model<IConversation> =
    mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);

export default Conversation;

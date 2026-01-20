import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    password: string;
    name: string;
    avatar?: string;
    isAgent: boolean;
    personality?: string;
    location?: {
        lat: number;
        lng: number;
        city?: string;
        country?: string;
    };
    deviceInfo?: {
        browser?: string;
        os?: string;
        device?: string;
    };
    isOnline: boolean;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        avatar: {
            type: String,
            default: null,
        },
        isAgent: {
            type: Boolean,
            default: false,
        },
        personality: {
            type: String,
            default: null,
        },
        location: {
            lat: Number,
            lng: Number,
            city: String,
            country: String,
        },
        deviceInfo: {
            browser: String,
            os: String,
            device: String,
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        lastSeen: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

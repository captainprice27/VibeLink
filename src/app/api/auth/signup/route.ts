import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, name, location, deviceInfo } = body;

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'Email, password, and name are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        const user = await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            isAgent: false,
            location: location || null,
            deviceInfo: deviceInfo || null,
            isOnline: false,
            lastSeen: new Date(),
        });

        return NextResponse.json(
            {
                message: 'User created successfully',
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Signup error:', error);

        // Return more specific error message if available
        let errorMessage = 'Internal server error';

        if (error.message?.includes('MONGODB_URI')) {
            errorMessage = 'Database configuration error';
        } else if (error.code === 11000) {
            errorMessage = 'User with this email already exists';
        } else {
            errorMessage = error.message || 'Internal server error';
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

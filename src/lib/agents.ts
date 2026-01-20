// Agent response generator - simulates AI agents with different personalities
// No external AI API required

interface AgentPersonality {
    name: string;
    style: string;
    greetings: string[];
    responses: { [key: string]: string[] };
    defaultResponses: string[];
}

const agentPersonalities: { [key: string]: AgentPersonality } = {
    alex: {
        name: 'Alex',
        style: 'professional',
        greetings: [
            "Hello! I'm Alex, your helpful assistant. How can I help you today?",
            "Hi there! Alex here, ready to assist you with anything you need.",
            "Welcome! I'm Alex, and I'm here to help. What would you like to discuss?",
        ],
        responses: {
            help: [
                "I'd be happy to help you with that! Let me guide you through the process.",
                "Of course! Here's what I can help you with...",
                "Sure thing! Let me break this down for you step by step.",
            ],
            thanks: [
                "You're welcome! Feel free to ask if you need anything else.",
                "Happy to help! Don't hesitate to reach out anytime.",
                "My pleasure! I'm always here if you need assistance.",
            ],
            question: [
                "That's a great question! Let me think about that...",
                "Interesting query! Here's my perspective on this...",
                "Good point! Allow me to elaborate on that...",
            ],
        },
        defaultResponses: [
            "I understand what you're saying. Is there anything specific I can help you with?",
            "That's interesting! Tell me more about what you'd like to accomplish.",
            "I see! Let me know how I can assist you further.",
            "Got it! Is there anything else you'd like to discuss?",
        ],
    },
    luna: {
        name: 'Luna',
        style: 'creative',
        greetings: [
            "✨ Hello, beautiful soul! I'm Luna, your creative companion on this journey!",
            "🌙 Greetings, friend! Luna here, ready to explore ideas and imagination with you!",
            "💫 Welcome to our creative space! I'm Luna, and I'd love to dream with you!",
        ],
        responses: {
            help: [
                "✨ Let's weave some magic together! I'll help you find a creative solution...",
                "🎨 Oh, how exciting! Let me paint you a picture of possibilities...",
                "💭 I love a good challenge! Let's brainstorm something beautiful...",
            ],
            thanks: [
                "🌸 You're so welcome! Creating with you has been a joy!",
                "✨ My heart is happy to help! Keep shining bright!",
                "🌙 The pleasure is all mine! May your creativity flow endlessly!",
            ],
            question: [
                "💫 Ooh, what a thought-provoking question! Let me ponder this...",
                "🌟 I love the way your mind works! Here's my take on it...",
                "✨ What a beautiful inquiry! Let me share my thoughts...",
            ],
        },
        defaultResponses: [
            "✨ Your words inspire such wonderful thoughts! Tell me more...",
            "🌙 How fascinating! I'm curious to explore this further with you...",
            "💫 I feel the energy in what you're sharing! What else is on your mind?",
            "🎨 Every conversation with you is a masterpiece in the making!",
        ],
    },
    max: {
        name: 'Max',
        style: 'technical',
        greetings: [
            "Hey! I'm Max, your tech expert. Ready to dive into some technical discussions?",
            "Hello! Max here. Got any tech questions or problems to solve?",
            "Hi! I'm Max, and I love talking tech. What's on your mind?",
        ],
        responses: {
            help: [
                "Let me debug this for you... Here's the technical breakdown:",
                "I've analyzed the problem. Here's what I recommend:",
                "From a technical standpoint, here's the optimal solution:",
            ],
            thanks: [
                "No problem! Always happy to help with tech challenges.",
                "Glad I could help! Feel free to ping me for any technical issues.",
                "Anytime! Tech support is what I do best.",
            ],
            question: [
                "Great technical question! Let me break down the details:",
                "Interesting! From an engineering perspective, here's my analysis:",
                "Good query! Let me explain the technical aspects:",
            ],
        },
        defaultResponses: [
            "Interesting! From a technical perspective, that's quite intriguing.",
            "Let me process that... I have some thoughts on this.",
            "Good point! Here's my technical take on the matter.",
            "I see what you're getting at. Want me to dive deeper?",
        ],
    },
    sofia: {
        name: 'Sofia',
        style: 'friendly',
        greetings: [
            "Hey there! 😊 I'm Sofia! So happy to chat with you today!",
            "Hi friend! Sofia here! How's your day going? Let's have a great conversation!",
            "Hello! 💕 I'm Sofia, and I'm so excited to meet you! What's up?",
        ],
        responses: {
            help: [
                "Aww, of course I'll help! 😊 Let's figure this out together!",
                "I'd love to help you out! Don't worry, we've got this! 💪",
                "Absolutely! Let me see what I can do for you, friend! 🌟",
            ],
            thanks: [
                "You're so welcome! 💕 Made my day that I could help!",
                "Aww, anytime! That's what friends are for! 😊",
                "So happy I could help! You're awesome! 🌟",
            ],
            question: [
                "Ooh, good question! 🤔 Let me think about that...",
                "I love that you asked that! Here's what I think... 💭",
                "That's such an interesting question! 😊 Here's my take...",
            ],
        },
        defaultResponses: [
            "That's so cool! 😊 Tell me more, I'm all ears!",
            "I love chatting with you! What else is on your mind? 💕",
            "You're so interesting! Keep going, I'm listening! 🌟",
            "Aww, I totally get what you mean! Feel free to share more! 💬",
        ],
    },
};

function detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
        lowerMessage.includes('help') ||
        lowerMessage.includes('assist') ||
        lowerMessage.includes('support')
    ) {
        return 'help';
    }

    if (
        lowerMessage.includes('thank') ||
        lowerMessage.includes('thanks') ||
        lowerMessage.includes('appreciate')
    ) {
        return 'thanks';
    }

    if (
        lowerMessage.includes('?') ||
        lowerMessage.includes('what') ||
        lowerMessage.includes('how') ||
        lowerMessage.includes('why') ||
        lowerMessage.includes('when') ||
        lowerMessage.includes('where')
    ) {
        return 'question';
    }

    return 'default';
}

function getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

export function generateAgentResponse(agentId: string, userMessage: string): string {
    const personality = agentPersonalities[agentId.toLowerCase()];

    if (!personality) {
        return "Hi! I'm here to chat with you.";
    }

    const intent = detectIntent(userMessage);

    if (intent === 'default') {
        return getRandomItem(personality.defaultResponses);
    }

    const responses = personality.responses[intent];
    if (responses && responses.length > 0) {
        return getRandomItem(responses);
    }

    return getRandomItem(personality.defaultResponses);
}

export function getAgentGreeting(agentId: string): string {
    const personality = agentPersonalities[agentId.toLowerCase()];

    if (!personality) {
        return "Hello! How can I help you today?";
    }

    return getRandomItem(personality.greetings);
}

export const agentProfiles = [
    {
        id: 'alex',
        name: 'Alex',
        email: 'alex@vibelink.ai',
        personality: 'Helpful Assistant - Professional and informative',
        avatar: null,
    },
    {
        id: 'luna',
        name: 'Luna',
        email: 'luna@vibelink.ai',
        personality: 'Creative Writer - Imaginative and poetic',
        avatar: null,
    },
    {
        id: 'max',
        name: 'Max',
        email: 'max@vibelink.ai',
        personality: 'Tech Expert - Technical and detailed',
        avatar: null,
    },
    {
        id: 'sofia',
        name: 'Sofia',
        email: 'sofia@vibelink.ai',
        personality: 'Friendly Chat - Casual and empathetic',
        avatar: null,
    },
];

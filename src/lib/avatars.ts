// Default SVG avatars for users who don't upload one

export const defaultAvatars = [
    // Abstract geometric patterns
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#1a1a1a"/>
    <circle cx="50" cy="40" r="20" fill="#00FF41"/>
    <circle cx="50" cy="85" r="30" fill="#00FF41"/>
  </svg>`,

    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#1a1a1a"/>
    <polygon points="50,20 80,70 20,70" fill="#ADFF2F"/>
  </svg>`,

    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#fff"/>
    <circle cx="50" cy="40" r="20" fill="#FF6B6B"/>
    <circle cx="50" cy="85" r="30" fill="#FF6B6B"/>
  </svg>`,

    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#fff"/>
    <polygon points="50,20 80,70 20,70" fill="#4ECDC4"/>
  </svg>`,
];

export function getRandomAvatar(): string {
    const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
    return `data:image/svg+xml,${encodeURIComponent(defaultAvatars[randomIndex])}`;
}

export function generateAvatarFromName(name: string): string {
    // Generate a consistent avatar based on name
    const index = name.charCodeAt(0) % defaultAvatars.length;
    return `data:image/svg+xml,${encodeURIComponent(defaultAvatars[index])}`;
}

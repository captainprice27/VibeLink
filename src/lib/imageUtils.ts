export const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'video/mp4'
    ];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Only images (PNG, JPG, WEBP, SVG), PDF documents, and MP4 videos are allowed.',
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File size must be less than 2MB.',
        };
    }

    return { valid: true };
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

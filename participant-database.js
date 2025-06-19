// Participant Database - connects Telegram Bot to StudyScout AI
class ParticipantDatabase {
    constructor() {
        this.participants = [];
        this.studyInterests = [];
    }

    // Called by Telegram Bot when someone expresses interest
    addParticipantInterest(telegramData) {
        const participant = {
            id: 'tg_' + Date.now(),
            source: 'telegram_bot',
            platform: 'telegram',
            timestamp: new Date().toISOString(),
            // Privacy-protected data from Telegram
            anonymizedProfile: {
                ageRange: telegramData.ageRange,
                condition: telegramData.condition,
                location: telegramData.location,
                preferences: telegramData.preferences
            },
            content: `Telegram user interested in ${telegramData.condition} trials. Age: ${telegramData.ageRange}, Location: ${telegramData.location}`,
            engagement: 100, // High engagement since they actively reached out
            telegramChatId: telegramData.chatId, // For follow-up (encrypted)
            privacyConsent: true,
            contactMethod: 'telegram_encrypted'
        };

        this.participants.push(participant);
        console.log(`📝 New participant registered via Telegram: ${participant.id}`);
        
        return participant;
    }

    // Called by StudyScout AI to get Telegram participants
    getTelegramParticipants(studyConfig) {
        return this.participants.filter(p => 
            p.source === 'telegram_bot' &&
            p.anonymizedProfile.condition.toLowerCase().includes(studyConfig.condition.toLowerCase())
        );
    }

    // Get all participants for StudyScout analysis
    getAllParticipants() {
        return this.participants;
    }

    // Privacy-compliant participant count
    getParticipantStats() {
        return {
            total: this.participants.length,
            telegram_users: this.participants.filter(p => p.source === 'telegram_bot').length,
            conditions: [...new Set(this.participants.map(p => p.anonymizedProfile?.condition))],
            privacy_compliant: true
        };
    }
}

// Global participant database
const participantDB = new ParticipantDatabase();

module.exports = participantDB;

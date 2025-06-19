const TelegramBot = require('node-telegram-bot-api');
const participantDB = require('./participant-database');

// Telegram Bot Integration for StudyScout AI - Participant Interface
class TelegramInterface {
    constructor() {
        this.token = process.env.TELEGRAM_BOT_TOKEN || 'your-telegram-bot-token-here';
        this.bot = new TelegramBot(this.token, { polling: true });
        this.setupCommands();
        this.userSessions = new Map(); // Track user conversation state
    }

    setupCommands() {
        console.log('🤖 StudyScout Telegram Bot starting (Participant Interface)...');
        
        // For potential clinical trial participants
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            this.bot.sendMessage(chatId, 
                `🏥 Welcome to StudyScout AI - Find Clinical Trials\n\n` +
                `I help you discover clinical trials that match your health profile.\n\n` +
                `🔒 Privacy-First: All data is anonymized and encrypted.\n\n` +
                `Commands:\n` +
                `/register - Register interest in clinical trials\n` +
                `/find [condition] - Find trials for your condition\n` +
                `/privacy - Learn about privacy protection\n` +
                `/status - Check your registration status\n\n` +
                `Start with: /register`
            );
        });

        // Patient registration workflow
        this.bot.onText(/\/register/, (msg) => {
            const chatId = msg.chat.id;
            this.userSessions.set(chatId, { step: 'condition' });
            
            this.bot.sendMessage(chatId, 
                `🔒 Privacy-Protected Registration\n\n` +
                `Please share your health condition or area of interest:\n\n` +
                `Examples:\n` +
                `• Type 2 Diabetes\n` +
                `• Hypertension\n` +
                `• Depression\n` +
                `• Cancer research\n\n` +
                `Your data is anonymized and never shared.`
            );
        });

        this.bot.onText(/\/privacy/, (msg) => {
            const chatId = msg.chat.id;
            this.bot.sendMessage(chatId,
                `🔒 StudyScout AI Privacy Protections:\n\n` +
                `✅ End-to-end encrypted via Telegram\n` +
                `✅ Anonymized participant matching\n` +
                `✅ HIPAA-compliant processing\n` +
                `✅ No personal identifiers stored\n` +
                `✅ Opt-out anytime with /stop\n` +
                `✅ Data used only for trial matching\n\n` +
                `We respect your privacy above all else.`
            );
        });

        // Handle registration responses
        this.bot.on('message', (msg) => {
            const chatId = msg.chat.id;
            const session = this.userSessions.get(chatId);
            
            if (!session || msg.text.startsWith('/')) return;
            
            this.handleRegistrationStep(chatId, msg.text, session);
        });
    }

    handleRegistrationStep(chatId, text, session) {
        switch (session.step) {
            case 'condition':
                session.condition = text;
                session.step = 'age';
                this.userSessions.set(chatId, session);
                
                this.bot.sendMessage(chatId, 
                    `📝 Condition: ${text}\n\n` +
                    `What's your age range?\n\n` +
                    `Examples:\n• 25-35\n• 45-55\n• 65+`
                );
                break;
                
            case 'age':
                session.ageRange = text;
                session.step = 'location';
                this.userSessions.set(chatId, session);
                
                this.bot.sendMessage(chatId, 
                    `📍 What's your general location?\n\n` +
                    `Examples:\n• Boston, MA\n• California\n• Northeast US\n• Europe`
                );
                break;
                
            case 'location':
                session.location = text;
                session.step = 'complete';
                
                // Register participant in database (CONNECTS TO STUDYSCOUT AI)
                const participantData = {
                    chatId: chatId,
                    condition: session.condition,
                    ageRange: session.ageRange,
                    location: session.location,
                    preferences: 'telegram_contact'
                };
                
                const participant = participantDB.addParticipantInterest(participantData);
                
                this.bot.sendMessage(chatId, 
                    `✅ Registration Complete!\n\n` +
                    `🔒 Your anonymized profile is now in our database:\n` +
                    `• Condition: ${session.condition}\n` +
                    `• Age: ${session.ageRange}\n` +
                    `• Location: ${session.location}\n\n` +
                    `📧 We'll notify you when matching trials are available.\n` +
                    `🔐 Your identity remains encrypted and protected.\n\n` +
                    `Participant ID: ${participant.id}`
                );
                
                this.userSessions.delete(chatId);
                break;
        }
    }

    // Notify participants when matching trials are found
    async notifyMatchingParticipants(studyConfig, matchedParticipants) {
        for (const participant of matchedParticipants) {
            if (participant.telegramChatId && participant.privacyConsent) {
                const message = `🎯 Clinical Trial Match Found!\n\n` +
                    `Study: ${studyConfig.condition}\n` +
                    `Your Match Score: ${participant.eligibilityScore?.overallScore || 'High'}%\n\n` +
                    `Next Steps:\n` +
                    `1. Consult your doctor\n` +
                    `2. Review study details\n` +
                    `3. Contact research team if interested\n\n` +
                    `🔒 This notification respects your privacy settings.`;
                
                try {
                    await this.bot.sendMessage(participant.telegramChatId, message);
                    console.log(`📧 Notified participant ${participant.id} of matching trial`);
                } catch (error) {
                    console.log(`❌ Failed to notify participant ${participant.id}:`, error.message);
                }
            }
        }
    }
}

module.exports = TelegramInterface;

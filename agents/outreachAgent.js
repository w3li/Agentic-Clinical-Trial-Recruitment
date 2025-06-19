const OpenAI = require('openai');
const nodemailer = require('nodemailer');

class OutreachAgent {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.agentId = 'outreach-specialist-001';
        
        // Initialize email transporter if credentials available
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                this.emailTransporter = nodemailer.createTransporter({
                    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                    port: process.env.EMAIL_PORT || 587,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
                console.log('✅ Email transporter initialized');
            } else {
                console.log('⚠️  Email credentials not configured, using demo mode');
                this.emailTransporter = null;
            }
        } catch (error) {
            console.log('⚠️  Email setup failed, using demo mode:', error.message);
            this.emailTransporter = null;
        }
    }

    async generateStrategies(scoredParticipants) {
        console.log('💬 Generating outreach strategies...');
        
        const strategies = [];
        
        for (const participant of scoredParticipants.slice(0, 10)) { // Top 10 for demo
            try {
                const strategy = await this.createPersonalizedStrategy(participant);
                strategies.push({
                    participantId: participant.id,
                    participant: participant,
                    strategy: strategy
                });
            } catch (error) {
                console.error('Strategy generation error, using fallback:', error.message);
                // Fallback strategy generation
                const fallbackStrategy = this.createFallbackStrategy(participant);
                strategies.push({
                    participantId: participant.id,
                    participant: participant,
                    strategy: fallbackStrategy
                });
            }
        }
        
        return strategies;
    }

    createFallbackStrategy(participant) {
        return {
            method: participant.platform === 'reddit' ? 'reddit' : 'email',
            message: `Hello! I noticed your post about diabetes management. We're conducting a clinical research study that might interest you. This study is investigating new approaches to diabetes treatment and could provide access to cutting-edge therapies at no cost. Participation is completely voluntary and all medical care is provided free of charge. If you'd like to learn more, please reply and we can discuss whether this study might be a good fit. Thank you for considering participating in research that could help others with diabetes. Best regards, Clinical Research Team`,
            benefits: ['Free medical care', 'Access to new treatments', 'Contribute to diabetes research'],
            followUp: 'Follow up in 1 week if no response',
            timing: 'Send within 24 hours',
            method_type: 'fallback_generation'
        };
    }

    async createPersonalizedStrategy(participant) {
        const prompt = `
        Create a personalized, ethical outreach strategy for clinical trial recruitment.
        
        Participant Info:
        - Platform: ${participant.platform}
        - Content: ${participant.content}
        - Engagement: ${participant.engagement}
        - Score: ${participant.eligibilityScore.overallScore}
        
        Generate:
        1. Appropriate contact method for platform
        2. Personalized message (empathetic, informative, non-pushy)
        3. Key benefits to highlight
        4. Call-to-action
        5. Follow-up strategy
        
        Message should be:
        - Respectful and non-intrusive
        - Clearly identify as research opportunity
        - Include opt-out mechanism
        - HIPAA compliant
        - Maximum 200 words
        
        Return JSON with: method, message, benefits, followUp, timing
        `;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini-2024-07-18",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async sendMessage(participantId, message, method) {
        console.log(`📤 Sending outreach via ${method} to ${participantId}`);
        
        try {
            switch (method) {
                case 'email':
                    return await this.sendEmail(participantId, message);
                case 'reddit':
                    return await this.sendRedditMessage(participantId, message);
                case 'demo':
                    return this.simulateOutreach(participantId, message, method);
                default:
                    return { success: false, error: 'Unsupported method' };
            }
        } catch (error) {
            console.error('Message sending error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendEmail(participantId, message) {
        // For demo purposes - would need actual email addresses
        if (!this.emailTransporter) {
            return this.simulateOutreach(participantId, message, 'email');
        }
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'demo@example.com', // Would be participant's email
            subject: 'Research Opportunity - Clinical Trial',
            text: message,
            html: `<p>${message.replace(/\n/g, '<br>')}</p>`
        };

        const info = await this.emailTransporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    }

    async sendRedditMessage(participantId, message) {
        // For demo - would use Reddit API to send DM
        return this.simulateOutreach(participantId, message, 'reddit');
    }

    simulateOutreach(participantId, message, method) {
        // Demo simulation of outreach
        console.log(`📬 Simulated ${method} outreach to ${participantId}`);
        return {
            success: true,
            method: method,
            participantId: participantId,
            timestamp: new Date().toISOString(),
            status: 'sent',
            message: 'Outreach simulated successfully for demo'
        };
    }
}

module.exports = new OutreachAgent();

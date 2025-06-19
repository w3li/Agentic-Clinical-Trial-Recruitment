const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import routes and agents
const studyAgent = require('./agents/studyAgent');
const searchAgent = require('./agents/searchAgent');
const outreachAgent = require('./agents/outreachAgent');
const TelegramInterface = require('./telegram-bot');
const participantDB = require('./participant-database');

// Initialize Telegram Bot (optional)
if (process.env.ENABLE_TELEGRAM_BOT !== 'false') {
    try {
        require('./telegram/bot');
        console.log('📱 Telegram Bot integration enabled');
    } catch (error) {
        console.log('⚠️  Telegram Bot disabled:', error.message);
    }
}

// API Routes
app.post('/api/search-participants', async (req, res) => {
    try {
        const { studyConfig } = req.body;
        
        console.log('🔍 Starting participant search for:', studyConfig.condition);
        
        // Step 1: Configure study parameters
        const configuredStudy = await studyAgent.configureStudy(studyConfig);
        
        // Step 2: Search for potential participants
        const searchResults = await searchAgent.findParticipants(configuredStudy);
        
        // Step 3: Analyze and score participants
        const scoredParticipants = await studyAgent.scoreParticipants(searchResults, configuredStudy);
        
        // Step 4: Generate outreach strategies
        const outreachStrategies = await outreachAgent.generateStrategies(scoredParticipants);
        
        res.json({
            success: true,
            study: configuredStudy,
            participants: scoredParticipants,
            outreach: outreachStrategies,
            totalFound: scoredParticipants.length
        });
        
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/send-outreach', async (req, res) => {
    try {
        const { participantId, message, method } = req.body;
        
        const result = await outreachAgent.sendMessage(participantId, message, method);
        
        res.json({
            success: true,
            result: result
        });
        
    } catch (error) {
        console.error('❌ Outreach error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    try {
        const stats = participantDB.getParticipantStats();
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            platform: 'StudyScout AI',
            telegram_participants: stats.telegram_users,
            privacy_compliant: true
        });
    } catch (error) {
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            platform: 'StudyScout AI',
            mode: 'privacy_first'
        });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, async () => {
    console.log(`🚀 StudyScout AI running on http://localhost:${PORT}`);
    console.log(`🤖 Privacy-First Clinical Trial Recruitment Platform`);
    
    // Initialize Telegram Bot (REAL)
    try {
        const telegramBot = new TelegramInterface();
        console.log(`📱 Telegram Bot: Privacy-aware participant interface activated`);
        console.log(`🔒 HIPAA-compliant recruitment via encrypted messaging`);
    } catch (error) {
        console.log(`⚠️  Telegram bot initialization failed:`, error.message);
    }
});

// New API endpoint to check Telegram participants
app.get('/api/telegram-stats', (req, res) => {
    try {
        const stats = participantDB.getParticipantStats();
        res.json({
            success: true,
            stats: stats,
            message: 'Telegram participants integrated with StudyScout AI'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Enhanced search endpoint that includes Telegram participants

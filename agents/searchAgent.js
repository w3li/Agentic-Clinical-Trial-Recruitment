const axios = require('axios');
const snoowrap = require('snoowrap');
const fs = require('fs');
const path = require('path');
const participantDB = require('../participant-database');

class SearchAgent {
    constructor() {
        this.platforms = ['reddit', 'twitter', 'forums'];
        this.agentId = 'participant-finder-001';
        
        // Initialize Reddit client if credentials available
        try {
            if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
                this.reddit = new snoowrap({
                    userAgent: process.env.REDDIT_USER_AGENT || 'StudyScout/1.0',
                    clientId: process.env.REDDIT_CLIENT_ID,
                    clientSecret: process.env.REDDIT_CLIENT_SECRET
                });
                console.log('✅ Reddit client initialized');
            } else {
                console.log('⚠️  Reddit credentials not found, using demo data only');
                this.reddit = null;
            }
        } catch (error) {
            console.log('⚠️  Reddit initialization failed, using demo data:', error.message);
            this.reddit = null;
        }
    }

    async findParticipants(studyConfig) {
        console.log('🔍 Searching for participants across platforms...');
        
        const allResults = [];
        
        // Search Telegram Bot participants (REAL DATA)
        const telegramParticipants = participantDB.getTelegramParticipants(studyConfig);
        if (telegramParticipants.length > 0) {
            console.log(`📱 Found ${telegramParticipants.length} Telegram participants`);
            allResults.push(...telegramParticipants);
        }
        
        // Search Reddit
        if (this.reddit) {
            const redditResults = await this.searchReddit(studyConfig);
            allResults.push(...redditResults);
        }
        
        // Search Twitter (if API available)
        if (process.env.TWITTER_BEARER_TOKEN) {
            const twitterResults = await this.searchTwitter(studyConfig);
            allResults.push(...twitterResults);
        }
        
        // Add mock results for demo purposes (hackathon speed)
        const mockResults = this.generateMockResults(studyConfig);
        allResults.push(...mockResults);
        
        console.log(`📈 Found ${allResults.length} potential participants`);
        console.log(`📱 ${telegramParticipants.length} from Telegram (REAL), ${allResults.length - telegramParticipants.length} from other sources`);
        return allResults;
    }

    async searchReddit(studyConfig) {
        console.log('🔍 Searching Reddit...');
        const results = [];
        
        try {
            // Define subreddits based on condition
            const subreddits = this.getRelevantSubreddits(studyConfig.condition);
            
            for (const subreddit of subreddits) {
                const posts = await this.reddit.getSubreddit(subreddit)
                    .getHot({ limit: 10 });
                
                for (const post of posts) {
                    if (this.matchesSearchTerms(post.title + ' ' + post.selftext, studyConfig.searchTerms)) {
                        results.push({
                            id: post.id,
                            platform: 'reddit',
                            source: `r/${subreddit}`,
                            content: post.title + ' ' + post.selftext,
                            author: post.author.name,
                            url: `https://reddit.com${post.permalink}`,
                            timestamp: new Date(post.created_utc * 1000),
                            engagement: post.score + post.num_comments
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Reddit search error:', error);
        }
        
        return results;
    }

    async searchTwitter(studyConfig) {
        console.log('🔍 Searching Twitter...');
        const results = [];
        
        try {
            const searchQuery = studyConfig.searchTerms.join(' OR ');
            const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
                },
                params: {
                    query: searchQuery,
                    max_results: 20,
                    'tweet.fields': 'created_at,public_metrics'
                }
            });
            
            if (response.data.data) {
                response.data.data.forEach(tweet => {
                    results.push({
                        id: tweet.id,
                        platform: 'twitter',
                        source: 'twitter',
                        content: tweet.text,
                        url: `https://twitter.com/i/status/${tweet.id}`,
                        timestamp: new Date(tweet.created_at),
                        engagement: tweet.public_metrics.like_count + tweet.public_metrics.retweet_count
                    });
                });
            }
        } catch (error) {
            console.error('Twitter search error:', error);
        }
        
        return results;
    }

    getRelevantSubreddits(condition) {
        const subredditMap = {
            'diabetes': ['diabetes', 'diabetes_t2', 'diabeticRecipes', 'type2diabetes'],
            'type 2 diabetes': ['diabetes_t2', 'diabetes', 'type2diabetes'],
            'hypertension': ['hypertension', 'bloodpressure', 'cardiology'],
            'depression': ['depression', 'mentalhealth', 'therapy'],
            'alzheimer': ['alzheimers', 'dementia', 'aging'],
            'cancer': ['cancer', 'oncology', 'chemotherapy']
        };
        
        const key = condition.toLowerCase();
        return subredditMap[key] || ['health', 'medical'];
    }

    matchesSearchTerms(text, searchTerms) {
        const lowerText = text.toLowerCase();
        return searchTerms.some(term => lowerText.includes(term.toLowerCase()));
    }

    generateMockResults(studyConfig) {
        // Load realistic demo data
        try {
            const demoDataPath = path.join(__dirname, '..', 'data', 'demo-participants.json');
            const demoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf8'));
            
            // Filter demo data based on study condition
            const relevantDemo = demoData.filter(participant => 
                participant.condition_indicators.some(indicator => 
                    indicator.toLowerCase().includes(studyConfig.condition.toLowerCase()) ||
                    studyConfig.condition.toLowerCase().includes(indicator.toLowerCase())
                )
            );
            
            console.log(`📊 Using ${relevantDemo.length} relevant demo participants`);
            return relevantDemo;
            
        } catch (error) {
            console.error('Error loading demo data:', error);
            // Fallback to simple mock data
            return [
                {
                    id: 'fallback_001',
                    platform: 'reddit',
                    source: 'r/diabetes_t2',
                    content: `My A1C has been around 8.2 for the past year. I'm 45 and struggling with my ${studyConfig.condition}. Recently switched from metformin to a combination therapy.`,
                    author: 'healthseeker45',
                    url: 'https://reddit.com/mock',
                    timestamp: new Date(),
                    engagement: 15
                }
            ];
        }
    }
}

module.exports = new SearchAgent();

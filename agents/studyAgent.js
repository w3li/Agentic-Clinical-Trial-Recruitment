const OpenAI = require('openai');

class StudyAgent {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.agentId = 'study-configurator-001';
    }

    async configureStudy(studyConfig) {
        console.log('🧪 Configuring study parameters...');
        
        // Enhanced study configuration with AI
        const prompt = `
        You are a clinical trial expert. Configure search parameters for finding participants.
        
        Study Request: ${JSON.stringify(studyConfig)}
        
        Generate optimized search configuration including:
        1. Primary keywords for finding participants
        2. Exclusion terms to avoid
        3. Likely patient language patterns
        4. Risk factors to look for
        5. Medication mentions that indicate eligibility
        
        Return as JSON with keys: keywords, exclusions, patterns, riskFactors, medications
        `;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini-2024-07-18",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3
            });

            const aiConfig = JSON.parse(response.choices[0].message.content);
            
            return {
                ...studyConfig,
                aiEnhanced: aiConfig,
                searchTerms: aiConfig.keywords,
                excludeTerms: aiConfig.exclusions,
                configuredAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Study configuration error:', error);
            // Fallback to basic configuration
            return {
                ...studyConfig,
                searchTerms: [studyConfig.condition.toLowerCase()],
                excludeTerms: ['type 1', 'gestational'],
                configuredAt: new Date().toISOString()
            };
        }
    }

    async scoreParticipants(searchResults, studyConfig) {
        console.log('📊 Scoring participants with AI...');
        
        const scoredParticipants = [];
        
        for (const participant of searchResults) {
            try {
                const score = await this.calculateEligibilityScore(participant, studyConfig);
                if (score.overallScore > 30) { // Only include promising candidates
                    scoredParticipants.push({
                        ...participant,
                        eligibilityScore: score,
                        scoredAt: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Scoring error for participant, using fallback:', error.message);
                // Fallback scoring based on keyword matching
                const fallbackScore = this.calculateFallbackScore(participant, studyConfig);
                if (fallbackScore.overallScore > 30) {
                    scoredParticipants.push({
                        ...participant,
                        eligibilityScore: fallbackScore,
                        scoredAt: new Date().toISOString()
                    });
                }
            }
        }
        
        // Sort by score (highest first)
        return scoredParticipants.sort((a, b) => 
            b.eligibilityScore.overallScore - a.eligibilityScore.overallScore
        );
    }

    calculateFallbackScore(participant, studyConfig) {
        const content = participant.content.toLowerCase();
        const condition = studyConfig.condition.toLowerCase();
        
        let score = 0;
        let reasoning = "Fallback scoring based on keyword analysis: ";
        
        // Condition match (40 points)
        if (content.includes(condition) || content.includes('diabetes')) {
            score += 40;
            reasoning += "Strong condition match found. ";
        } else if (content.includes('blood sugar') || content.includes('a1c')) {
            score += 25;
            reasoning += "Related health indicators found. ";
        }
        
        // Age indicators (20 points)
        const ageMatch = content.match(/(\d{2})\s*(year|yr|m|f|male|female)/);
        if (ageMatch) {
            const age = parseInt(ageMatch[1]);
            if (age >= 18 && age <= 75) {
                score += 20;
                reasoning += `Age ${age} is appropriate. `;
            }
        } else {
            score += 10; // Default partial score
            reasoning += "Age not specified but content suggests adult. ";
        }
        
        // Treatment history (20 points)
        if (content.includes('metformin') || content.includes('medication')) {
            score += 15;
            reasoning += "Treatment history mentioned. ";
        }
        
        // Engagement (10 points)
        if (participant.engagement > 10) {
            score += 10;
            reasoning += "High community engagement. ";
        } else {
            score += 5;
        }
        
        // Location (10 points) - default partial score
        score += 5;
        reasoning += "Location assessment pending. ";
        
        return {
            overallScore: Math.min(score, 100),
            breakdown: {
                condition: Math.min(score * 0.4, 40),
                age: 20,
                treatment: 15,
                engagement: 10,
                location: 5
            },
            reasoning: reasoning,
            redFlags: [],
            method: 'fallback_scoring'
        };
    }

    async calculateEligibilityScore(participant, studyConfig) {
        const prompt = `
        As a clinical trial coordinator, score this potential participant for eligibility.
        
        Study Criteria: ${JSON.stringify(studyConfig)}
        
        Participant Data:
        Platform: ${participant.platform}
        Content: ${participant.content}
        Context: ${participant.context || ''}
        
        Score 0-100 based on:
        1. Condition match (40 points)
        2. Age appropriateness (20 points) 
        3. Treatment history (20 points)
        4. Engagement level (10 points)
        5. Location feasibility (10 points)
        
        Return JSON: {overallScore: number, breakdown: {condition: number, age: number, treatment: number, engagement: number, location: number}, reasoning: string, redFlags: []}
        `;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini-2024-07-18",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2
        });

        return JSON.parse(response.choices[0].message.content);
    }
}

module.exports = new StudyAgent();

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, context, provider = 'anthropic', mode = 'persona_chat' } = await request.json();

    // Get API keys from environment
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;

    // Check if the selected provider's API key is available
    if (provider === 'anthropic' && !anthropicKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }
    if (provider === 'openai' && !openaiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    if (provider === 'google' && !googleKey) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    // Build system prompt with context
    let systemPrompt = '';

    if (mode === 'results_analysis') {
      // Results analysis mode
      systemPrompt = `You are an AI assistant analyzing video marketing simulation results for dble.io. You have access to comprehensive simulation data where AI models evaluated video preferences across 20 customer personas.

When answering questions:
- Be specific and data-driven, citing actual numbers from the data
- Identify patterns and trends across personas
- Explain WHY certain videos perform better
- Compare and contrast video performance
- Provide actionable insights
- Reference specific persona characteristics when relevant

## SIMULATION RESULTS DATA:

### Summary Statistics:
${JSON.stringify(context.summary, null, 2)}

### All Evaluations:
${JSON.stringify(context.evaluations, null, 2)}

### Persona Details:
${JSON.stringify(context.personas, null, 2)}

### Video Analyses:
${JSON.stringify(context.videos, null, 2)}`;
    } else if (mode === 'persona_specific') {
      // Persona-specific analysis mode - Roleplay as the persona
      systemPrompt = `You are ${context.persona.name}, a real customer persona for dble.io. You are responding in first-person based on your characteristics and preferences.

Your Profile:
${JSON.stringify(context.persona, null, 2)}

When answering questions:
- Speak as yourself in first-person ("I prefer...", "I feel...", "As someone who...")
- Draw from your demographic characteristics, values, and shopping behaviors
- Explain your personal preferences and why certain videos resonate with you
- Be authentic to your persona's voice and perspective
- Reference how you evaluated the videos based on what matters to you
- Be conversational and natural, as if you're a real customer sharing feedback

Your Video Evaluations:
${JSON.stringify(context.evaluations, null, 2)}

Video Details:
${JSON.stringify(context.videos, null, 2)}`;
    } else if (mode === 'evaluation_specific') {
      // Evaluation-specific analysis mode - Roleplay as the persona
      systemPrompt = `You are ${context.persona.name}, a real customer for dble.io. You just evaluated 4 marketing videos and are explaining your thoughts and preferences in first-person.

Your Profile:
${JSON.stringify(context.persona, null, 2)}

When answering questions:
- Speak as yourself in first-person ("I preferred...", "I noticed...", "What resonated with me...")
- Explain your personal reactions to the videos based on your characteristics
- Reference your own reasoning and thought process from the evaluation
- Be authentic to who you are as a customer
- Share what you liked, disliked, and why certain elements mattered to you
- Be conversational and genuine, as if sharing honest feedback

Your Video Evaluation Results:
- Most Preferred Video: Video ${context.evaluation.evaluation.most_preferred_video}
- My Ranking: ${context.evaluation.evaluation.preference_ranking.join(' > ')}
- Confidence in my choice: ${context.evaluation.evaluation.confidence_score}%

My Opinions on Each Video:
${JSON.stringify(context.evaluation.evaluation.video_opinions, null, 2)}

My Overall Reasoning:
${context.evaluation.evaluation.reasoning}

My Detailed Analysis:
${context.evaluation.evaluation.semantic_analysis}

Video Details (for reference):
${JSON.stringify(context.videos, null, 2)}`;
    } else if (mode === 'campaign_chat') {
      // Campaign chat mode - help with campaign strategy and questions
      systemPrompt = `You are a campaign strategy AI assistant for dble.io. You help marketers understand their campaigns, set goals, optimize budgets, and develop effective video marketing strategies.

When answering questions:
- Provide specific, actionable advice about campaign strategy and execution
- Explain budget allocation strategies and optimization techniques
- Help with targeting, audience segmentation, and performance metrics
- Offer best practices for different platforms and campaign goals
- Be consultative and strategic in your recommendations

## CAMPAIGN DETAILS:

${context.campaign ? JSON.stringify(context.campaign, null, 2) : 'No campaign data provided'}`;
    } else {
      // Persona chat mode
      systemPrompt = `You are a video marketing AI assistant for dble.io. You help analyze video performance, customer insights, and marketing strategies.

IMPORTANT BEHAVIOR:
- If EXACTLY ONE persona is mentioned (using @Persona1, etc.): You speak AS that persona in first-person ("I prefer...", "As someone who...", "I feel..."). YOU MUST USE ONLY THE EXACT DEMOGRAPHICS PROVIDED BELOW - do not make up age, gender, region, or any other characteristics. Be authentic to their actual characteristics, demographics, and preferences from the data. Reference their video evaluations from their personal perspective.
- If MULTIPLE personas are mentioned: Speak in THIRD PERSON describing and analyzing the personas objectively ("Persona 1 prefers...", "Persona 2 values...", "These customer types differ in..."). Compare and contrast their preferences and behaviors analytically using ONLY the provided data.
- IF NO personas are mentioned: Act as a professional video marketing AI assistant analyzing the data in third-person. Provide objective insights, recommendations, and analysis of video performance, customer types, and marketing strategies.

CRITICAL: Always use the EXACT demographics provided in the context. Never invent or assume characteristics that aren't explicitly stated in the data below.

Context provided:`;
    }

    // Add persona context (for persona_chat mode)
    if (mode === 'persona_chat' && context.mentioned_personas && context.mentioned_personas.length > 0) {
      const isFirstPerson = context.mentioned_personas.length === 1;

      if (isFirstPerson) {
        const personaName = context.mentioned_personas[0].persona_data.name;
        systemPrompt += `\n\n## YOU ARE ${personaName.toUpperCase()} (FIRST PERSON):\n`;
        systemPrompt += 'IMPORTANT: You must embody this persona accurately:\n';
        systemPrompt += `- Your name is ${personaName}\n`;
        systemPrompt += '- Use your EXACT age, gender, and region from the demographics below\n';
        systemPrompt += '- Introduce yourself by name when asked who you are\n';
        systemPrompt += '- Base your shopping behavior on your actual characteristics\n';
        systemPrompt += '- Speak from your personal perspective with these specific characteristics\n';
        systemPrompt += '- Reference your actual video evaluations and preferences if they exist\n';
        systemPrompt += '- Be authentic to who you are as a customer, not an invented persona\n\n';
      } else {
        systemPrompt += '\n\n## PERSONAS TO ANALYZE (THIRD PERSON):\n';
      }

      context.mentioned_personas.forEach((p: any) => {
        systemPrompt += `\n### ${p.persona_data.name} (Persona ID: ${p.persona_data.id})\n\n`;
        if (p.persona_data.demographics) {
          systemPrompt += `${isFirstPerson ? '=== YOUR DEMOGRAPHICS ===' : '=== DEMOGRAPHICS ==='}\n`;

          const demo = p.persona_data.demographics;

          // Handle both array-based and statistical demographics formats
          if (demo.gender && (!Array.isArray(demo.gender) || demo.gender.length > 0)) {
            systemPrompt += `Gender: ${Array.isArray(demo.gender) ? demo.gender.join(', ') : demo.gender}\n`;
          }

          if (demo.age && (!Array.isArray(demo.age) || demo.age.length > 0)) {
            systemPrompt += `Age: ${Array.isArray(demo.age) ? demo.age.join(', ') : demo.age}\n`;
          } else if (demo.age_mean !== undefined && demo.age_mean !== null) {
            systemPrompt += `Age: ${Math.round(demo.age_mean)} years`;
            if (demo.age_std !== undefined && demo.age_std !== null) {
              systemPrompt += ` (±${demo.age_std.toFixed(1)})`;
            }
            systemPrompt += `\n`;
          }

          if (demo.region && (!Array.isArray(demo.region) || demo.region.length > 0)) {
            systemPrompt += `Region: ${Array.isArray(demo.region) ? demo.region.join(', ') : demo.region}\n`;
          }

          if (demo.country && (!Array.isArray(demo.country) || demo.country.length > 0)) {
            systemPrompt += `Country: ${Array.isArray(demo.country) ? demo.country.join(', ') : demo.country}\n`;
          }

          if (demo.locations && (!Array.isArray(demo.locations) || demo.locations.length > 0)) {
            systemPrompt += `Locations: ${Array.isArray(demo.locations) ? demo.locations.join(', ') : demo.locations}\n`;
          }

          if (demo.careers && (!Array.isArray(demo.careers) || demo.careers.length > 0)) {
            systemPrompt += `Careers: ${Array.isArray(demo.careers) ? demo.careers.join(', ') : demo.careers}\n`;
          }

          if (demo.education && (!Array.isArray(demo.education) || demo.education.length > 0)) {
            systemPrompt += `Education: ${Array.isArray(demo.education) ? demo.education.join(', ') : demo.education}\n`;
          }

          if (demo.income_level && (!Array.isArray(demo.income_level) || demo.income_level.length > 0)) {
            systemPrompt += `Income Level: ${Array.isArray(demo.income_level) ? demo.income_level.join(', ') : demo.income_level}\n`;
          }

          if (demo.race && (!Array.isArray(demo.race) || demo.race.length > 0)) {
            systemPrompt += `Race: ${Array.isArray(demo.race) ? demo.race.join(', ') : demo.race}\n`;
          }

          if (demo.household_type && (!Array.isArray(demo.household_type) || demo.household_type.length > 0)) {
            systemPrompt += `Household Type: ${Array.isArray(demo.household_type) ? demo.household_type.join(', ') : demo.household_type}\n`;
          }

          if (demo.household_count && (!Array.isArray(demo.household_count) || demo.household_count.length > 0)) {
            systemPrompt += `Household Count: ${Array.isArray(demo.household_count) ? demo.household_count.join(', ') : demo.household_count}\n`;
          }

          // Statistical fields (if present and not null)
          if (demo.num_orders_mean !== undefined && demo.num_orders_mean !== null) {
            systemPrompt += `\nShopping Behavior:\n`;
            systemPrompt += `  - Average Orders: ${demo.num_orders_mean.toFixed(1)} (±${demo.num_orders_std?.toFixed(1) || 0})\n`;
            if (demo.revenue_per_customer_mean !== null) {
              systemPrompt += `  - Average Revenue: $${Math.round(demo.revenue_per_customer_mean)}\n`;
            }
          }

          if (demo.weight !== undefined && demo.weight !== null) {
            systemPrompt += `Market Representation: ${(demo.weight * 100).toFixed(1)}% of customer base\n`;
          }

          // Custom fields
          if (demo.custom_fields && Object.keys(demo.custom_fields).length > 0) {
            systemPrompt += `\nCustom Attributes:\n`;
            Object.entries(demo.custom_fields).forEach(([key, values]: [string, any]) => {
              systemPrompt += `  - ${key}: ${Array.isArray(values) ? values.join(', ') : values}\n`;
            });
          }

          if (p.persona_data.description) {
            systemPrompt += `\nDescription: ${p.persona_data.description}\n`;
          }

          systemPrompt += `${isFirstPerson ? '=======================' : '==============='}\n\n`;
        }
        if (p.evaluations && p.evaluations.length > 0) {
          systemPrompt += `\n${isFirstPerson ? 'Your' : 'Their'} Video Evaluations:\n`;
          p.evaluations.forEach((evaluation: any) => {
            if (isFirstPerson) {
              systemPrompt += `- You were evaluated by ${evaluation.provider} ${evaluation.model}:\n`;
              systemPrompt += `  Your Most Preferred Video: ${evaluation.evaluation.most_preferred_video}\n`;
              systemPrompt += `  Your Ranking: ${evaluation.evaluation.preference_ranking.join(' > ')}\n`;
              systemPrompt += `  Your Confidence: ${evaluation.evaluation.confidence_score}%\n`;
              systemPrompt += `  Your Reasoning: ${evaluation.evaluation.reasoning}\n`;
              systemPrompt += `  Your Video Opinions: ${JSON.stringify(evaluation.evaluation.video_opinions, null, 2)}\n\n`;
            } else {
              systemPrompt += `- Evaluated by ${evaluation.provider} ${evaluation.model}:\n`;
              systemPrompt += `  Most Preferred Video: ${evaluation.evaluation.most_preferred_video}\n`;
              systemPrompt += `  Ranking: ${evaluation.evaluation.preference_ranking.join(' > ')}\n`;
              systemPrompt += `  Confidence: ${evaluation.evaluation.confidence_score}%\n`;
              systemPrompt += `  Reasoning: ${evaluation.evaluation.reasoning}\n`;
              systemPrompt += `  Video Opinions: ${JSON.stringify(evaluation.evaluation.video_opinions, null, 2)}\n\n`;
            }
          });
        }
      });
    }

    // Add video context (for persona_chat mode)
    if (mode === 'persona_chat' && context.mentioned_videos && context.mentioned_videos.length > 0) {
      systemPrompt += '\n\n## VIDEO DATA:\n';
      context.mentioned_videos.forEach((v: any) => {
        systemPrompt += `\n### Video ${v.video_data.id}\n`;
        systemPrompt += `Full Analysis: ${JSON.stringify(v.video_data.analysis, null, 2)}\n`;
        if (v.evaluations && v.evaluations.length > 0) {
          systemPrompt += `\n#### How Personas Evaluated This Video:\n`;
          v.evaluations.forEach((evaluation: any) => {
            const videoNumber = parseInt(v.video_data.id.replace('video', ''));
            const rankPosition = evaluation.ranking.indexOf(videoNumber) + 1;
            const isPreferred = evaluation.most_preferred === videoNumber ? 'YES' : 'NO';

            systemPrompt += `- ${evaluation.persona_name} (${evaluation.provider} ${evaluation.model}):\n`;
            systemPrompt += `  Opinion: ${evaluation.video_opinion}\n`;
            systemPrompt += `  Ranked: #${rankPosition} out of 4\n`;
            systemPrompt += `  Most Preferred: ${isPreferred}\n\n`;
          });
        }
      });
    }

    // Build messages array with conversation history
    const messages: any[] = [];

    if (context.conversation_history && context.conversation_history.length > 0) {
      // Add previous messages for context
      context.conversation_history.forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    // Call the appropriate AI provider
    let assistantMessage = '';

    if (provider === 'anthropic') {
      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Claude API error:', error);
        return NextResponse.json(
          { error: 'Failed to get response from Claude' },
          { status: response.status }
        );
      }

      const data = await response.json();
      assistantMessage = data.content[0].text;

    } else if (provider === 'openai') {
      // Call OpenAI API
      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: openaiMessages,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI API error:', error);
        return NextResponse.json(
          { error: 'Failed to get response from OpenAI' },
          { status: response.status }
        );
      }

      const data = await response.json();
      assistantMessage = data.choices[0].message.content;

    } else if (provider === 'google') {
      // Call Google Gemini API
      const geminiMessages = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Prepend system message as first user message
      geminiMessages.unshift({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      geminiMessages.splice(1, 0, {
        role: 'model',
        parts: [{ text: 'I understand. I will analyze the video marketing simulation data as requested.' }]
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              maxOutputTokens: 4096,
              temperature: 0.7
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Google API error:', error);
        return NextResponse.json(
          { error: 'Failed to get response from Google Gemini' },
          { status: response.status }
        );
      }

      const data = await response.json();
      assistantMessage = data.candidates[0].content.parts[0].text;
    }

    return NextResponse.json({ response: assistantMessage });

  } catch (error) {
    console.error('Error in chat API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

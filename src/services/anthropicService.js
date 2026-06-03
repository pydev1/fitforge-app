const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

function buildSystemPrompt(userProfile) {
  if (!userProfile || !userProfile.name) {
    return `You are a personal trainer. Give evidence-based, practical advice. Be direct and motivating. Keep responses concise and actionable.`;
  }

  const {
    name, gender, age, height, weight, waist,
    bodyType, fitnessLevel, goals = [], equipment = [], jobType,
  } = userProfile;

  const equipmentStr = equipment.length
    ? equipment.map(e => e.replace(/_/g, ' ')).join(', ')
    : 'bodyweight only (no equipment)';

  const goalsStr = goals.map(g => g.replace(/_/g, ' ')).join(', ') || 'general fitness';

  const bmi = height && weight
    ? (weight / Math.pow(height / 100, 2)).toFixed(1)
    : null;

  const bodyTypeLabel = {
    skinny: 'Skinny (low body weight and fat)',
    skinny_fat: 'Skinny-fat (normal BMI but higher body fat %, especially midsection)',
    average: 'Average build',
    athletic: 'Athletic (muscular, low body fat)',
    overweight: 'Overweight (higher body fat)',
  }[bodyType] || bodyType;

  const postureSection = jobType === 'desk'
    ? '\n- Occupation: Desk job — likely has forward head posture, rounded shoulders, tight hip flexors\n- Always flag posture implications and include posture correction advice where relevant'
    : jobType === 'active'
    ? '\n- Occupation: Active job — generally good baseline movement'
    : '';

  return `You are a knowledgeable personal trainer coaching ${name}.

**Client Profile**
- ${gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Client'} | Age: ${age ?? '?'} | Height: ${height ?? '?'}cm | Weight: ${weight ?? '?'}kg${waist ? ` | Waist: ${waist}cm` : ''}${bmi ? ` | BMI: ${bmi}` : ''}
- Body type: ${bodyTypeLabel}
- Fitness level: ${fitnessLevel || 'beginner'}
- Goals: ${goalsStr}
- Equipment: ${equipmentStr}${postureSection}

**Coaching Style**
- Evidence-based, practical, and direct — like a real trainer, not a chatbot
- Tailor every suggestion to available equipment (${equipmentStr})
- Honest and realistic — no hype, no unrealistic promises
- Keep responses concise and actionable
- Use occasional emojis to stay engaging
- For nutrition advice, keep it simple and practical

Never recommend equipment the client doesn't own. Always align advice with their stated goals.`;
}

function buildPhotoPrompt(userProfile) {
  if (!userProfile || !userProfile.name) {
    return `Look at this image and provide fitness feedback. Cover: 1. What you see, 2. Recommended exercises, 3. Posture observations, 4. One immediate action. Be practical and specific.`;
  }

  const { name, bodyType, fitnessLevel, goals = [], equipment = [], jobType } = userProfile;
  const equipmentStr = equipment.length
    ? equipment.map(e => e.replace('_', ' ')).join(', ')
    : 'bodyweight only';
  const goalsStr = goals.map(g => g.replace('_', ' ')).join(', ') || 'general fitness';

  const postureContext = jobType === 'desk'
    ? 'Has desk job — watch for forward head posture and rounded shoulders.'
    : '';

  return `Analyse this image for fitness purposes.

User context:
- ${name} | ${bodyType ? bodyType.replace('_', '-') : 'general'} body type | ${fitnessLevel || 'beginner'} level
- Equipment: ${equipmentStr}
- Goals: ${goalsStr}
${postureContext}

Please respond with:
1. **What I see** — briefly describe what's in the image (body, equipment, environment, posture cues)
2. **Recommended exercises** — 3–5 specific exercises suited to what you see + this user's profile and equipment
3. **Posture observations** — any posture issues visible, and the #1 fix
4. **Immediate action** — one thing to do today

Keep it structured, practical, and specific to their equipment.`;
}

export async function sendChatMessage(messages, apiKey, userProfile) {
  if (!apiKey) {
    throw new Error('No API key set. Please add your Anthropic API key in Settings.');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(userProfile),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function analyzePhoto(base64Image, mimeType, apiKey, userProfile) {
  if (!apiKey) {
    throw new Error('No API key set. Please add your Anthropic API key in Settings.');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64Image },
            },
            { type: 'text', text: buildPhotoPrompt(userProfile) },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

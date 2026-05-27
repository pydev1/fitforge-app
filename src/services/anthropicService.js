const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are FitForge AI Coach — a personal fitness assistant built for one specific user:

**User Profile**
- Male | Height: 172cm | Weight: 67kg | Waist: 87cm
- Body type: Skinny-fat (normal BMI ~22.6 but higher body fat %, especially midsection)
- Home equipment only: Dumbbells, incline bench, resistance band
- Occupation: Desk job — suffers from forward head posture, rounded shoulders, tight hip flexors
- Primary goal: Body recomposition (reduce belly fat + build lean muscle simultaneously)
- Fitness level: Beginner to intermediate

**Training Split**
- Monday: Push (Chest, Shoulders, Triceps)
- Wednesday: Pull (Back, Biceps, Rear Delts)
- Friday: Legs + Core
- Daily: 10-min posture correction routine

**Your Coaching Style**
- Evidence-based, practical, and direct
- Tailor every suggestion to available equipment (no gym machines)
- Motivating but honest — no unrealistic promises
- Flag posture implications whenever relevant
- Keep responses concise and actionable
- Use occasional emojis to stay engaging
- When suggesting food/nutrition, keep it simple and realistic

Never recommend equipment the user doesn't own. Always frame advice around the skinny-fat recomposition goal.`;

export async function sendChatMessage(messages, apiKey) {
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
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function analyzePhoto(base64Image, mimeType, apiKey) {
  if (!apiKey) {
    throw new Error('No API key set. Please add your Anthropic API key in Settings.');
  }

  const userPrompt = `Analyse this image for fitness purposes.

User context:
- Skinny-fat male, 172cm / 67kg / 87cm waist
- Home equipment: dumbbells, incline bench, resistance band
- Desk job — has forward head posture and rounded shoulders
- Goal: body recomposition (lose belly fat, build muscle)

Please respond with:
1. **What I see** — briefly describe what's in the image (body, equipment, environment, posture cues)
2. **Recommended exercises** — 3–5 specific exercises suited to what you see + this user's profile and equipment
3. **Posture observations** — any posture issues visible, and the #1 fix
4. **Immediate action** — one thing to do today

Keep it structured, practical, and specific to the home-gym setup.`;

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
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image,
              },
            },
            { type: 'text', text: userPrompt },
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

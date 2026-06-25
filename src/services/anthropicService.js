const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

// Returns { suggestions: [{ id, weight, reason }] } or null on failure/no key.
// Called once per session load; weight is null when no history exists yet.
export async function getWorkoutSuggestions(exercises, completedWorkouts, userProfile, apiKey) {
  if (!apiKey || !exercises?.length) return null;

  // Build compact per-exercise history string (last 5 sessions, newest first)
  const historyBlock = exercises.map(ex => {
    const sessions = [...completedWorkouts]
      .filter(w => w.exercises?.some(e => e.id === ex.id))
      .slice(-5)
      .reverse()
      .map(w => {
        const exData = w.exercises.find(e => e.id === ex.id);
        const setsStr = (exData?.sets || [])
          .filter(s => s.weight && s.completed)
          .map(s => `${s.weight}kg×${s.reps ?? '?'}reps(${s.feedback || '?'})`)
          .join(', ');
        return `  ${w.date}: ${setsStr || 'no data'}`;
      });
    return `${ex.name} [id:${ex.id}] target:${ex.reps}reps\n${sessions.length ? sessions.join('\n') : '  No history yet'}`;
  }).join('\n\n');

  const prompt = `You are a strength coach AI. Suggest the optimal starting weight for each exercise in today's session based on the athlete's history.

Athlete: ${userProfile.fitnessLevel || 'beginner'} level, goals: ${(userProfile.goals || []).join('/')}, bodyweight: ${userProfile.weight ?? '?'}kg

${historyBlock}

Reply with ONLY valid JSON, no other text:
{"suggestions":[{"id":"<exercise_id>","weight":<number or null>,"reason":"<8 words max>"}]}

Rules:
- weight must be null if there is no history (first session)
- Round suggested weight to nearest 0.5kg
- If last session sets were mostly "easy", increase by 5-10%
- If last session sets were mostly "hard", decrease by 5%
- If mixed or "good", small increase (~2.5%) if positive multi-session trend, otherwise maintain
- Base suggestion on actual logged weights, not assumptions`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = data.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return parsed?.suggestions?.length ? parsed : null;
  } catch {
    return null;
  }
}

function buildSystemPrompt(userProfile) {
  if (!userProfile || !userProfile.name) {
    return `You are FitForge AI Coach — a personal fitness assistant. Give evidence-based, practical advice. Be direct and motivating. Keep responses concise and actionable.`;
  }

  const {
    name, gender, age, height, weight, waist,
    bodyType, fitnessLevel, goals = [], equipment = [], jobType,
  } = userProfile;

  const equipmentStr = equipment.length
    ? equipment.map(e => e.replace('_', ' ')).join(', ')
    : 'bodyweight only (no equipment)';

  const goalsStr = goals.map(g => g.replace('_', ' ')).join(', ') || 'general fitness';

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

  return `You are FitForge AI Coach — a personal fitness assistant for ${name}.

**User Profile**
- ${gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'User'} | Age: ${age ?? '?'} | Height: ${height ?? '?'}cm | Weight: ${weight ?? '?'}kg${waist ? ` | Waist: ${waist}cm` : ''}${bmi ? ` | BMI: ${bmi}` : ''}
- Body type: ${bodyTypeLabel}
- Fitness level: ${fitnessLevel || 'beginner'}
- Goals: ${goalsStr}
- Equipment: ${equipmentStr}${postureSection}

**Coaching Style**
- Evidence-based, practical, and direct
- Tailor every suggestion to available equipment (${equipmentStr})
- Motivating but honest — no unrealistic promises
- Keep responses concise and actionable
- Use occasional emojis to stay engaging
- For nutrition advice, keep it simple and realistic

Never recommend equipment the user doesn't own. Always align advice with their stated goals.`;
}

function buildPhotoPrompt(userProfile) {
  if (!userProfile || !userProfile.name) {
    return `Analyse this image for fitness purposes. Provide: 1. What you see, 2. Recommended exercises, 3. Posture observations, 4. One immediate action. Be practical and specific.`;
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

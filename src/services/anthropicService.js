const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

function buildSystemPrompt(userProfile, generatedPlan, progress) {
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

  let basePrompt = `You are FitForge AI Coach — a personal fitness assistant for ${name}.

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

  if (generatedPlan?.schedule && generatedPlan?.workouts) {
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    let planSection = `\n\n**Workout Schedule** (today is ${todayName})\n`;
    days.forEach(day => {
      const workoutId = generatedPlan.schedule[day];
      if (!workoutId) {
        planSection += `- ${day}: Rest Day\n`;
      } else {
        const w = generatedPlan.workouts[workoutId];
        if (w) {
          planSection += `- ${day}: ${w.name} — ${w.focus}\n`;
          const exList = w.exercises?.map(e => `${e.name} (${e.sets}×${e.reps})`).join(', ');
          if (exList) planSection += `  Exercises: ${exList}\n`;
        }
      }
    });
    basePrompt += planSection;
  }

  if (progress?.completedWorkouts?.length > 0) {
    const recent = [...progress.completedWorkouts].slice(-5).reverse();
    let historySection = '\n\n**Recent Workout History** (newest first)\n';
    recent.forEach(w => {
      const label = generatedPlan?.workouts?.[w.type]?.name || w.type || 'Workout';
      historySection += `- ${w.date}: ${label}\n`;
    });
    basePrompt += historySection;
    basePrompt += '\nUse this history to answer questions like "what did I train last?" or "what should I do today?" without asking.';
  }

  return basePrompt;
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

export function streamChatMessage(messages, apiKey, userProfile, generatedPlan, progress, onChunk, onDone, onError) {
  if (!apiKey) {
    onError(new Error('No API key set. Please add your Anthropic API key in Settings.'));
    return;
  }

  const xhr = new XMLHttpRequest();
  xhr.open('POST', API_URL, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('x-api-key', apiKey);
  xhr.setRequestHeader('anthropic-version', '2023-06-01');

  let cursor = 0;

  xhr.onprogress = () => {
    const raw = xhr.responseText.slice(cursor);
    cursor = xhr.responseText.length;
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          onChunk(ev.delta.text);
        }
        if (ev.type === 'error') {
          onError(new Error(ev.error?.message || 'Stream error'));
        }
      } catch {}
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 400) {
      try {
        const err = JSON.parse(xhr.responseText);
        onError(new Error(err?.error?.message || `API error ${xhr.status}`));
      } catch {
        onError(new Error(`API error ${xhr.status}`));
      }
    } else {
      onDone();
    }
  };

  xhr.onerror = () => onError(new Error('Network error. Check your connection.'));

  xhr.send(JSON.stringify({
    model: MODEL,
    max_tokens: 1024,
    stream: true,
    system: buildSystemPrompt(userProfile, generatedPlan, progress),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  }));
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

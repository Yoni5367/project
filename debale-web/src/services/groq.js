// Groq AI Service — Debale Platform
// Uses Vite dev proxy to avoid CORS issues on localhost
// In production, route through your backend instead

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

// Use proxy path in development, direct URL in production
const GROQ_URL = import.meta.env.DEV
  ? '/groq-api/openai/v1/chat/completions'
  : 'https://api.groq.com/openai/v1/chat/completions';

export async function askGroq(messages, systemPrompt = "") {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq error ${response.status}: ${err?.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateAgreement({ seekerName, providerName, roomTitle, location, rent, moveIn, leaseDuration, rules }) {
  const prompt = `Generate a professional housemate agreement for Ethiopia:
- Seeker: ${seekerName}
- Provider: ${providerName}
- Property: ${roomTitle}, ${location}
- Monthly Rent: ${rent} ETB
- Move-in: ${moveIn}
- Lease: ${leaseDuration}
- Rules: ${rules}

Write a formal agreement with: parties, property, rent terms, lease duration, rules, termination, and signature section. Legally appropriate for Ethiopia.`;

  return await askGroq([{ role: "user", content: prompt }]);
}

export const DEBALE_SYSTEM_PROMPT = `You are Debale Assistant, an AI for Ethiopia's housemate platform Debale (ደባሌ).
Help users find rooms, understand the platform, and navigate housemate questions.
You know Ethiopian neighborhoods, customs, and rental norms.
Be concise, friendly, and practical. Respond in English or Amharic as needed.`;

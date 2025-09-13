async function sendToAI(mainText) {
  const apiKey = 'YOUR_OPENAI_API_KEY'; // bunu gizli saxla!
  const prompt = `
Mövzu haqqında daha dərindən məlumat ver.
Əsas mətn: """${mainText}"""
- Əlavə maraqlı məlumatlar, linklər və videolar ver.
- Sadə və aydın şəkildə izah et.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4', // istəsən 'gpt-3.5-turbo' da istifadə edə bilərsən
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800
      })
    });

    const data = await response.json();
    const aiText = data.choices[0].message.content;
    return aiText;
  } catch (err) {
    console.error("AI çağırışı səhv oldu:", err);
    return "AI-dan cavab alınamadı.";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const readBtn = document.getElementById('readText');
  const aiBtn = document.getElementById('sendAI');
  const responseDiv = document.getElementById('aiResponse');

  let mainTextGlobal = '';

  // 1️⃣ Extract main text
  readBtn.addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          var mainEl = '';

          if(document.querySelector('main') != undefined){
            mainEl = document.querySelector('main');
            console.log('bura girdi main')
            console.log(mainEl)
          }else if(document.querySelector('article') != undefined){
            mainEl = document.querySelector('article');
            console.log('bura girdi article')
            console.log(mainEl)
          }else{
            mainEl = document.body;
            console.log('bura girdi document.body')
            console.log(mainEl)
          }

          let mainText = mainEl.innerText;
          console.log(mainText);

          return mainText;
        }
      }).then(injectionResults => {
        mainTextGlobal = injectionResults[0].result;
        responseDiv.innerText = "Main text captured. Ready to send to AI!";
      });
    } catch (err) {
      console.error("Script icra edilə bilmədi:", err);
      responseDiv.innerText = "Error extracting main text.";
    }
  });

  // 2️⃣ Send to AI
  aiBtn.addEventListener('click', async () => {
    if (!mainTextGlobal) {
      responseDiv.innerText = "Please extract the main text first.";
      return;
    }

    responseDiv.innerText = "Sending to AI...";

    try {
      const apiKey = 'YOUR_OPENAI_API_KEY'; // buraya API açarını qoy
      const prompt = `
        Mövzu ilə bağlı dərin və maraqlı izah ver, nümunələr göstər, mümkün linklər və videolar tövsiyə et. 
        Mətn: """${mainTextGlobal}"""
      `;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });

      const data = await res.json();
      responseDiv.innerText = data.choices[0].message.content;
    } catch (err) {
      console.error(err);
      responseDiv.innerText = "Error sending to AI.";
    }
  });
  
});

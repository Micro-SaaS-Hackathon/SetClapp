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

    const systemPromptInput = document.getElementById('systemPrompt');

    try {
            const apiKey = 'AIzaSyC28kX8U3valZj3TvB_RLz_er4B3hLDGHE';
            const systemPrompt = systemPromptInput.value.trim();
            const userPrompt = mainTextGlobal.trim();

            if (!apiKey || !userPrompt) {
                alert('API açarı və istifadəçi sualı boş buraxıla bilməz.')
                return;
            }

            try {
                const model = 'gemini-1.5-flash-latest';
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

                const payload = {
                    contents: [{
                        parts: [{ text: userPrompt }]
                    }]
                };

                if (systemPrompt) {
                    payload.systemInstruction = {
                        parts: [{ text: systemPrompt }]
                    };
                }

                const apiResponse = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                
                const responseData = await apiResponse.json();

                if (responseData.error) {
                    throw new Error(responseData.error.message);
                }
                
                const text = responseData.candidates[0].content.parts[0].text;
                responseDiv.textContent = text;

            } catch (err) {
                console.error(`Bir xəta baş verdi: ${err.message}`);
                console.log(err);
            }
    } catch (err) {
      console.log(err);
      responseDiv.innerText = "Error sending to AI.";
    }
  });
  
});

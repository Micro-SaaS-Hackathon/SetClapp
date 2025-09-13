let recorder;
let audioChunks = [];
let fullTranscript = '';
let isRecording = false;

// Gemini API açarı
let GEMINI_API_KEY = '';
chrome.storage.local.get(['apiKey'], (result) => {
  GEMINI_API_KEY = result.apiKey || '';
});

// Recording-i başlat
function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];

        // Serverə göndər və transkript al
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        try {
          const response = await fetch('http://localhost:3000/transcribe', {
            method: 'POST',
            body: formData
          });
          const data = await response.json();
          console.error(data);
          if (data.transcription) {
            fullTranscript += data.transcription + '\n';
            console.log('Azərbaycanca transkript:', data.transcription);
          } else {
            console.error('Transkript alınmadı');
          }
        } catch (error) {
          console.error('Server sorğusu səhvi:', error);
        }

        // Fayla save et
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `meeting_transcript_${timestamp}.txt`;
        const blob = new Blob([fullTranscript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`Transkript ${filename} faylına saxlandı!`);

        // Gemini-yə göndər
        if (fullTranscript.trim()) {
          sendToGemini(fullTranscript);
        }

        fullTranscript = '';
      };

      isRecording = true;
      recorder.start(10000); // Hər 10 saniyədə chunk (real-time üçün)
      console.log('Recording başladı!');
    })
    .catch((err) => {
      console.error('Səs cihazı səhvi:', err);
    });
}

// Recording-i dayandır
function stopRecording() {
  isRecording = false;
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
  }
  console.log('Recording dayandırıldı!');
}

// Gemini API-yə göndər
async function sendToGemini(text) {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API açarı yoxdur!');
    return;
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Bu dərs/meeting-in tam transkriptini Azərbaycan dilində xülasə et: ${text}` }] }]
      })
    });

    const data = await response.json();
    const summary = data.candidates[0].content.parts[0].text;
    console.log('Gemini xülasəsi:', summary);
    chrome.runtime.sendMessage({ type: 'summary', text: summary });
  } catch (error) {
    console.error('Gemini səhvi:', error);
  }
}

// Popup mesajları
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'start') {
    startRecording();
    sendResponse({ status: 'started' });
  } else if (message.type === 'stop') {
    stopRecording();
    sendResponse({ status: 'stopped' });
  }
});
const express = require('express');
const speech = require('@google-cloud/speech');
const multer = require('multer');
const cors = require('cors'); // Add this
const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const port = 3000;

const client = new speech.SpeechClient({
  keyFilename: 'server/your-google-cloud-key.json' // Ensure this file exists
});

app.use(cors()); // Enable CORS for all origins
app.use(express.json({ limit: '50mb' }));

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio faylı göndərilməyib' });
    }

    const audioBytes = req.file.buffer.toString('base64');
    const audio = {
      content: audioBytes
    };
    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'az-AZ',
      model: 'default',
      enableAutomaticPunctuation: true
    };
    const [response] = await client.recognize({ config, audio });
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    res.json({ transcription });
  } catch (error) {
    console.error('Transkripsiya səhvi:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server http://localhost:${port} ünvanında işləyir`);
});
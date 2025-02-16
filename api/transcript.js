import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';
import serverless from 'serverless-http';

const app = express();
app.use(cors());

app.get('/api/transcript/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    res.json(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

export default serverless(app);

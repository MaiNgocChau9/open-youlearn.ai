import { YoutubeTranscript } from 'youtube-transcript';

YoutubeTranscript.fetchTranscript('bWmBf__1wv8')
  .then(transcript => {
    console.log(transcript);
  })
  .catch(error => {
    console.error('Error fetching transcript:', error);
  });

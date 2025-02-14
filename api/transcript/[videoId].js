import { YoutubeTranscript } from 'youtube-transcript';

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const videoId = url.pathname.split('/').pop();
    
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Missing videoId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    return new Response(JSON.stringify(transcript), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch transcript' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
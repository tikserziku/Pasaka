import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request) {
  try {
    // Log the start of the request
    console.log('Starting image generation request');
    
    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OPENAI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'API configuration error: missing API key' },
        { status: 500 }
      );
    }
    
    console.log('API key found, initializing OpenAI client');
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    const { prompt } = body;
    
    if (!prompt) {
      console.error('Missing prompt in request');
      return NextResponse.json(
        { error: 'Missing prompt in request' },
        { status: 400 }
      );
    }
    
    console.log('Sending request to OpenAI with prompt:', prompt.substring(0, 50) + '...');
    
    try {
      // Generate image
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });
      
      console.log('Received response from OpenAI:', JSON.stringify(response).substring(0, 100) + '...');
      
      if (!response.data || !response.data[0] || !response.data[0].url) {
        console.error('Invalid response from OpenAI:', JSON.stringify(response));
        return NextResponse.json(
          { error: 'Invalid API response' },
          { status: 500 }
        );
      }
      
      console.log('Successfully generated image URL');
      return NextResponse.json({ imageUrl: response.data[0].url });
    } catch (apiError) {
      console.error('OpenAI API error:', apiError);
      
      // Extract detailed error information
      const errorDetails = {
        message: apiError.message,
        status: apiError.status,
        type: apiError.type,
        code: apiError.code
      };
      
      console.error('Error details:', JSON.stringify(errorDetails));
      
      return NextResponse.json(
        { 
          error: 'OpenAI API error', 
          details: errorDetails
        },
        { status: apiError.status || 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled error in image generation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate image', 
        details: error.message
      },
      { status: 500 }
    );
  }
}
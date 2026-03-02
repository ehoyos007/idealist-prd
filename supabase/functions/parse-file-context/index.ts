import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileName, fileType } = await req.json();

    if (!fileContent || !fileName) {
      throw new Error('Missing required fields: fileContent, fileName');
    }

    console.log(`Processing file: ${fileName} (${fileType})`);

    // For text-based files, just return the content directly
    const textTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv'];
    if (textTypes.some(t => fileType?.startsWith(t)) || fileName.match(/\.(txt|md|json|csv)$/i)) {
      // Decode base64 if needed
      let textContent = fileContent;
      if (fileContent.includes('base64,')) {
        const base64Data = fileContent.split('base64,')[1];
        textContent = atob(base64Data);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          extractedText: textContent,
          fileName 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For PDFs, images, and other documents, use Lovable AI to extract/describe content
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Prepare the content for AI processing
    let aiPrompt = '';
    let messages: any[] = [];

    if (fileType?.startsWith('image/')) {
      // For images, use vision to describe
      messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that describes images in detail for context in a business idea discussion. Focus on any text, diagrams, charts, or relevant visual information that could inform a business idea.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please describe this image in detail, extracting any text, data, or relevant information that could be useful for developing a business idea. File: ${fileName}`
            },
            {
              type: 'image_url',
              image_url: {
                url: fileContent.startsWith('data:') ? fileContent : `data:${fileType};base64,${fileContent}`
              }
            }
          ]
        }
      ];
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // For PDFs, we'll extract what we can and have AI summarize
      messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that processes document content for context in a business idea discussion.'
        },
        {
          role: 'user',
          content: `The user has uploaded a PDF file named "${fileName}". Since I cannot directly read PDFs, please acknowledge this file upload and let the user know you're aware they shared a document. In a real implementation, you would extract and summarize the PDF content here.`
        }
      ];
    } else {
      // For other document types
      messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that processes document content for context in a business idea discussion.'
        },
        {
          role: 'user',
          content: `The user has uploaded a file named "${fileName}" of type "${fileType}". Please acknowledge this file and provide any useful context you can extract or infer from the filename.`
        }
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: fileType?.startsWith('image/') ? 'gpt-4o' : 'gpt-4o-mini',
        messages,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || `File uploaded: ${fileName}`;

    console.log(`Successfully processed ${fileName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedText,
        fileName 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing file:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

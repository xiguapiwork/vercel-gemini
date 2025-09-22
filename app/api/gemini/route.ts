import { google } from '@ai-sdk/google';
import { CoreMessage, generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface GeminiRequestBody {
  apikey: string;
  model: string;
  messageList: CoreMessage[];
  system_instruction?: string;
  thinkingBudget?: number;
  search?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: GeminiRequestBody = await req.json();
    const {
      apikey,
      model,
      messageList,
      system_instruction,
      thinkingBudget,
      search,
    } = body;

    if (!apikey || !model || !messageList || messageList.length === 0) {
      return NextResponse.json(
        { status: 'error', response: 'Missing required fields: apikey, model, or messageList' },
        { status: 400 }
      );
    }

    const { text, toolResults } = await generateText({
      model: google(model),
      messages: messageList,
      system: system_instruction,
      tools: {
        url_context: google.tools.urlContext({}),
        ...(search === true && { 
            google_search: google.tools.googleSearch({})
        })
      },
      providerOptions: {
        google: {
          apiKey: apikey,
          ...(thinkingBudget && thinkingBudget > 0 && {
            thinkingConfig: {
              thinkingBudget: thinkingBudget,
              includeThoughts: true,
            },
          }),
        },
      },
    });

    return NextResponse.json({
      status: 'success',
      response: {
        text,
        toolResults,
      },
    });

  } catch (error) {
    console.error('[Gemini API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { status: 'error', response: errorMessage },
      { status: 500 }
    );
  }
}

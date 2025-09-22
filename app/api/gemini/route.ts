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

    // 这是最终的、严格遵循您要求的代码
    const { text, toolResults } = await generateText({
      model: google(model),
      messages: messageList,
      system: system_instruction,

      // ** 严格按照您的要求，内联定义 tools 对象，包含了您指出的 `{}` **
      tools: {
        url_context: google.tools.urlContext({}), // ！！！已修正，严格匹配官方文档
        
        ...(search === true && { 
            google_search: google.tools.googleSearch({}) // ！！！已修正，严格匹配官方文档
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

    // 成功返回
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

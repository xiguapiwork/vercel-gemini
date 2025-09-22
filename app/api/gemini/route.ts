import { createGoogleGenerativeAI } from '@ai-sdk/google';
// 修正第一处：从下面的 import 语句中移除了 GenerateTextOptions
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
        {
          status: 'error',
          response: 'Missing required fields: apikey, model, or messageList.',
        },
        { status: 400 }
      );
    }

    const google = createGoogleGenerativeAI({
      apiKey: apikey,
    });

    const tools: any = {
      url_context: google.tools.urlContext({}),
    };

    if (search === true) {
      tools.google_search = google.tools.googleSearch({});
    }

    // 修正第二处：将 const options: GenerateTextOptions 改为 let options: any
    // 使用 let 是因为我们后面可能会动态添加属性
    let options: any = {
      model: google(model),
      messages: messageList,
      tools: tools,
    };

    if (system_instruction) {
      options.system = system_instruction;
    }

    if (thinkingBudget && thinkingBudget > 0) {
      options.providerOptions = {
        google: {
          thinkingConfig: {
            thinkingBudget: thinkingBudget,
            includeThoughts: true,
          },
        },
      };
    }

    const { text } = await generateText(options);

    return NextResponse.json({
      status: 'success',
      response: text,
    });

  } catch (error) {
    console.error('[Gemini API Error]', error);

    if (error instanceof Error) {
        return NextResponse.json(
            {
              status: 'error',
              response: error.message,
            },
            { status: 500 }
        );
    }
    
    return NextResponse.json(
      {
        status: 'error',
        response: 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}

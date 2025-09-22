import { google } from '@ai-sdk/google'; // 关键1：只使用这个默认的 google 导入
import { CoreMessage, generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 我们不再从请求体中接收 apikey
interface GeminiRequestBody {
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
      model,
      messageList,
      system_instruction,
      thinkingBudget,
      search,
    } = body;

    // 不再需要 apikey 的验证
    if (!model || !messageList || messageList.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          response: 'Missing required fields: model or messageList.',
        },
        { status: 400 }
      );
    }

    // 关键2：像您文档中一样，直接使用导入的 'google' 对象来定义工具
    const tools: any = {
      url_context: google.tools.urlContext({}),
    };

    if (search === true) {
      tools.google_search = google.tools.googleSearch({});
    }

    let options: any = {
      // 关键3：同样直接使用 'google' 来指定模型。
      // AI SDK 会自动从您在 Vercel 设置的环境变量中获取 API Key
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

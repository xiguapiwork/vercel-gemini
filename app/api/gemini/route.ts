import {
  createGoogleGenerativeAI,
  google as googleTools, // 关键修正1：导入默认的 google 对象并重命名为 googleTools 以获取工具
} from '@ai-sdk/google';
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

    // 关键修正2：创建一个用于鉴权的、纯净的 provider 实例
    const googleProvider = createGoogleGenerativeAI({
      apiKey: apikey,
    });

    // 关键修正3：使用重命名的 googleTools 来定义工具
    // 这是严格按照您文档中关于 tools 的写法
    const tools: any = {
      url_context: googleTools.tools.urlContext({}),
    };

    if (search === true) {
      tools.google_search = googleTools.tools.googleSearch({});
    }

    let options: any = {
      // 关键修正4：使用我们自定义的 provider 来指定模型
      model: googleProvider(model),
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

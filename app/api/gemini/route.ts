import { google } from '@ai-sdk/google';
import { CoreMessage, generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 您最初要求的、完整灵活的请求体结构
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
    
    // 使用默认导出的 `google` 对象来定义工具，这是唯一正确的方式
    const tools: any = {
      url_context: google.tools.urlContext(),
    };

    if (search === true) {
      tools.google_search = google.tools.googleSearch();
    }

    // 构建 generateText 的 options
    let options: any = {
      // 模型定义也使用默认的 `google` 对象
      model: google(model),
      messages: messageList,
      tools: tools,
    };

    // ** 这就是您提出的、最关键、最正确的解决方案 **
    // 我们将动态 API Key 和其他 Google 特有的配置，
    // 全部放入 `providerOptions.google` 对象中传递。
    // AI SDK 会自动捕获并使用它们。
    options.providerOptions = {
        google: {
            apiKey: apikey, // 直接将您的动态 API Key 放在这里
        }
    };

    // 添加所有可选功能
    if (system_instruction) {
      options.system = system_instruction;
    }

    if (thinkingBudget && thinkingBudget > 0) {
        options.providerOptions.google.thinkingConfig = {
            thinkingBudget: thinkingBudget,
            includeThoughts: true,
        };
    }

    const { text, toolResults } = await generateText(options);

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

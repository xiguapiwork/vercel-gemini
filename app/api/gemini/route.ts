import { google } from '@ai-sdk/google';
import { CoreMessage, generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 恢复您最初要求的、完整灵活的请求体结构
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

    // **错误修正 1：修复了愚蠢的类型比较错误**
    // 正确的写法是 'messageList.length === 0'
    if (!model || !messageList || messageList.length === 0) {
      return NextResponse.json(
        { status: 'error', response: 'Missing model or messageList' },
        { status: 400 }
      );
    }

    // 绕过 TypeScript 构建时类型检查错误的唯一方法
    const googleWithTools = google as any;

    const tools: any = {
      url_context: googleWithTools.tools.urlContext({}),
    };

    if (search === true) {
      tools.google_search = googleWithTools.tools.googleSearch({});
    }

    // 恢复所有您需要的功能
    let options: any = {
      model: google(model),
      // **错误修正 2：严格使用您要求的 messages 格式，不再错误地改成 prompt**
      messages: messageList,
      tools: tools,
    };

    // 恢复 system_instruction 功能
    if (system_instruction) {
      options.system = system_instruction;
    }

    // 恢复 thinkingBudget 功能
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

    // 按照您最初的要求，返回 status 和 response
    return NextResponse.json({
      status: 'success',
      response: text,
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

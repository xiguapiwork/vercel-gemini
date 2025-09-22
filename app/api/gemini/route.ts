import { createGoogleGenerativeAI } from '@ai-sdk/google';
// 关键的、真正的修复：
// 工具的定义需要从一个专门的 '/tools' 入口点导入。
// 这才是官方推荐的、在自定义 Provider 场景下使用工具的方式。
import { googleSearch, urlContext } from '@ai-sdk/google/tools';
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
    
    // 核心逻辑：
    // 创建一个使用您传来 apikey 的、专用的 provider 实例
    const customGoogleProvider = createGoogleGenerativeAI({
        apiKey: apikey,
    });

    // 使用从 '/tools' 入口点直接导入的函数来定义工具
    // 这不再依赖任何不确定的 '.tools' 属性，是100%可靠的。
    const tools: any = {
      url_context: urlContext(),
    };

    if (search === true) {
      tools.google_search = googleSearch();
    }

    // 构建 generateText 的 options，严格遵循您的所有要求
    let options: any = {
      // 使用您自定义的 provider 来初始化模型，确保 apikey 被使用
      model: customGoogleProvider(model),
      // 使用完整的 messageList
      messages: messageList,
      tools: tools,
    };

    // 添加所有可选功能
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

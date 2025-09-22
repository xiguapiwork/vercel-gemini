import {
  createGoogleGenerativeAI,
  google as defaultGoogleProvider, // 关键修正1：从 @ai-sdk/google 导入默认的 google 对象，重命名为 defaultGoogleProvider
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

    // 关键修正2：创建一个用于鉴权的、纯净的 provider 实例，这个实例只用于指定模型和API Key
    const customGoogleProvider = createGoogleGenerativeAI({
      apiKey: apikey,
    });

    // 关键修正3：使用默认导出的 'defaultGoogleProvider' 来定义工具。
    // 工具本身是无状态的，它们的定义不依赖于自定义的API Key。
    // 但是，它们的执行（如果需要API Key）会通过 generateText 的 providerOptions 传递。
    const tools: any = {
      url_context: defaultGoogleProvider.tools.urlContext({}),
    };

    if (search === true) {
      tools.google_search = defaultGoogleProvider.tools.googleSearch({});
    }

    let options: any = {
      // 关键修正4：使用我们自定义的 provider 实例来指定模型
      model: customGoogleProvider(model),
      messages: messageList,
      tools: tools,
      // 关键修正5：将自定义的 API Key 传递给所有 Google 工具和模型的 providerOptions
      // 这样，Google 相关的工具（如 google_search, url_context）在内部执行时，
      // 也会使用这个 apikey。这才是官方推荐的工具鉴权方式。
      providerOptions: {
        google: {
          apiKey: apikey, // 明确为所有 Google 相关的操作（包括工具）设置 API Key
          // 其他 thinkingConfig 等可以放在这里
        },
      },
    };

    if (system_instruction) {
      options.system = system_instruction;
    }

    // 将 thinkingBudget 移动到 providerOptions.google 内部，
    // 因为它是 Google 特有的配置。
    if (thinkingBudget && thinkingBudget > 0) {
      // 确保 providerOptions.google 存在
      if (!options.providerOptions?.google) {
        options.providerOptions = { google: {} };
      }
      options.providerOptions.google.thinkingConfig = {
        thinkingBudget: thinkingBudget,
        includeThoughts: true,
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

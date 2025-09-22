import { google } from '@ai-sdk/google';
import { CoreMessage, generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 只接收最必要的参数，API Key 从 Vercel 环境变量中读取
interface GeminiRequestBody {
  model: string;
  messageList: CoreMessage[];
  search?: boolean; // 简化：只保留 search 开关
  // thinkingBudget 和 system_instruction 暂时移除，确保最核心的功能先跑通
}

export async function POST(req: NextRequest) {
  try {
    const body: GeminiRequestBody = await req.json();
    const { model, messageList, search } = body;

    if (!model || !messageList || !messageList.length === 0) {
      return NextResponse.json(
        { status: 'error', response: 'Missing model or messageList' },
        { status: 400 }
      );
    }
    
    // 这是解决问题的最关键一行：
    // 我们告诉 TypeScript，请把 google 当作 any 类型来处理，
    // 这样它就不会再抱怨找不到 'tools' 的类型定义了。
    // 这能绕过库的类型定义文件可能存在的缺陷。
    const googleWithTools = google as any;

    const tools: any = {
        // 我们始终开启 url_context
        url_context: googleWithTools.tools.urlContext({}),
    };
    
    // 如果请求中 search 为 true，则添加 google_search 工具
    if (search === true) {
        tools.google_search = googleWithTools.tools.googleSearch({});
    }

    // 从 messageList 中提取最后一个用户的 prompt
    // 官方示例是单一 prompt，我们在这里模拟一下
    const lastUserMessage = messageList.findLast(msg => msg.role === 'user');
    if (!lastUserMessage) {
        return NextResponse.json(
            { status: 'error', response: 'No user message found in messageList' },
            { status: 400 }
          );
    }
    const prompt = lastUserMessage.content as string;


    // 下面的代码块，就是对您官方示例的直接复现
    const { text, sources, providerMetadata } = await generateText({
      model: google(model), // API Key 会自动从环境变量 GOOGLE_GENERATIVE_AI_API_KEY 读取
      prompt: prompt,
      tools: tools,
    });

    // 返回成功响应
    return NextResponse.json({
      status: 'success',
      response: {
        text: text,
        sources: sources,
        providerMetadata: providerMetadata,
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

import OpenAI from 'openai';

/**
 * 获取默认 LLM 配置（从 chrome.storage.sync 读取）
 * @returns {Promise<object|null>} 默认配置对象或 null
 */
async function getDefaultLlmConfig() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['llmConfigs'], (data) => {
        const configs = Array.isArray(data.llmConfigs) ? data.llmConfigs : [];
        const def = configs.find(cfg => cfg.isDefault) || configs[0] || null;
        resolve(def);
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * Get a chat completion from the LLM using the default config.
 * @param {Array<{role: string, content: string}>} messages - The chat messages.
 * @param {string} [model] - The model to use (优先于配置里的 model)。
 * @returns {Promise<string>} The response message content.
 */
export async function getChatCompletion(messages, model) {
  const config = await getDefaultLlmConfig();
  if (!config) throw new Error('未找到默认 LLM 配置');
  const openai = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    defaultHeaders: config.defaultHeaders || {},
  });
  const completion = await openai.chat.completions.create({
    model: model || config.model,
    messages,
  });
  return completion.choices[0].message.content;
} 
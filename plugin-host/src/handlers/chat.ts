/**
 * Chat RPC Handlers
 *
 * Handles chat.registerTool, chat.removeTool, chat.injectPrompt, chat.removePrompt
 * Allows plugins to extend the AI's tool set and system prompt.
 */

import type { RPCHandler, ToolRegistration, PromptRegistration } from "../types.js";

export const chatRegisterTool: RPCHandler = async (params, session) => {
  if (!session.capabilities.includes("chat:tools")) {
    throw new Error("Plugin lacks chat:tools capability");
  }

  const name = params.name as string;
  const description = params.description as string;
  const parameters = params.parameters as ToolRegistration["parameters"];

  if (typeof name !== "string") throw new Error("name must be a string");
  if (typeof description !== "string") throw new Error("description must be a string");

  const tool: ToolRegistration = { name, description, parameters };
  session.registeredTools.set(name, tool);

  console.log(`[Chat] Plugin ${session.pluginId} registered tool: ${name}`);
  return { success: true };
};

export const chatRemoveTool: RPCHandler = async (params, session) => {
  const name = params.name as string;
  if (typeof name !== "string") throw new Error("name must be a string");

  session.registeredTools.delete(name);
  console.log(`[Chat] Plugin ${session.pluginId} removed tool: ${name}`);
  return { success: true };
};

export const chatInjectPrompt: RPCHandler = async (params, session) => {
  if (!session.capabilities.includes("chat:prompts")) {
    throw new Error("Plugin lacks chat:prompts capability");
  }

  const id = params.id as string;
  const content = params.content as string;
  const position = params.position as "system" | "context";

  if (typeof id !== "string") throw new Error("id must be a string");
  if (typeof content !== "string") throw new Error("content must be a string");
  if (position !== "system" && position !== "context") {
    throw new Error("position must be 'system' or 'context'");
  }

  const prompt: PromptRegistration = { id, content, position };
  session.injectedPrompts.set(id, prompt);

  console.log(`[Chat] Plugin ${session.pluginId} injected prompt: ${id} (${position})`);
  return { success: true };
};

export const chatRemovePrompt: RPCHandler = async (params, session) => {
  const id = params.id as string;
  if (typeof id !== "string") throw new Error("id must be a string");

  session.injectedPrompts.delete(id);
  console.log(`[Chat] Plugin ${session.pluginId} removed prompt: ${id}`);
  return { success: true };
};

export function registerChatHandlers(handle: (method: string, handler: RPCHandler) => void): void {
  handle("chat.registerTool", chatRegisterTool);
  handle("chat.removeTool", chatRemoveTool);
  handle("chat.injectPrompt", chatInjectPrompt);
  handle("chat.removePrompt", chatRemovePrompt);
}

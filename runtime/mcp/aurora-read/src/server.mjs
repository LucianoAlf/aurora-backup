import { McpServer } from '@modelcontextprotocol/server';

import { errorEnvelope, normalizeError } from './errors.mjs';
import { TOOL_DEFINITIONS } from './registry.mjs';

export function createMcpServer(executor) {
  const server = new McpServer({ name: 'aurora-read', version: '0.2.0' });

  for (const [name, definition] of Object.entries(TOOL_DEFINITIONS)) {
    server.registerTool(
      name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.inputSchema,
        annotations: definition.annotations,
      },
      async (args) => {
        try {
          const { result, serialized } = await executor.execute(name, args);
          return {
            content: [{ type: 'text', text: serialized }],
            structuredContent: result,
            isError: result?.ok === false,
          };
        } catch (error) {
          const safe = normalizeError(error);
          const envelope = errorEnvelope(safe);
          return {
            content: [{ type: 'text', text: JSON.stringify(envelope) }],
            structuredContent: envelope,
            isError: true,
          };
        }
      },
    );
  }

  return server;
}

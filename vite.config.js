import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

function createDevAiGatewayProxyPlugin() {
  return {
    name: "dev-ai-gateway-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/ai-gateway")) {
          next();
          return;
        }

        const targetUrlHeader = req.headers["x-ai-gateway-target-url"];
        const targetUrl = Array.isArray(targetUrlHeader)
          ? targetUrlHeader[0]
          : targetUrlHeader;

        if (!targetUrl || !/^https?:\/\//u.test(String(targetUrl))) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              error: {
                message: "缺少合法的 x-ai-gateway-target-url 头。",
              },
            }),
          );
          return;
        }

        try {
          const requestBody =
            req.method === "GET" || req.method === "HEAD"
              ? undefined
              : await readRequestBody(req);
          const forwardedHeaders = new Headers();

          Object.entries(req.headers).forEach(([key, value]) => {
            if (
              !value ||
              [
                "host",
                "connection",
                "content-length",
                "x-ai-gateway-target-url",
              ].includes(key.toLowerCase())
            ) {
              return;
            }

            const normalizedValue = Array.isArray(value)
              ? value.join(", ")
              : value;

            if (normalizedValue) {
              forwardedHeaders.set(key, normalizedValue);
            }
          });

          const upstreamResponse = await fetch(String(targetUrl), {
            method: req.method,
            headers: forwardedHeaders,
            body:
              requestBody && requestBody.length > 0 ? requestBody : undefined,
            redirect: "manual",
          });
          const responseBuffer = Buffer.from(
            await upstreamResponse.arrayBuffer(),
          );

          res.statusCode = upstreamResponse.status;

          upstreamResponse.headers.forEach((value, key) => {
            if (
              ["content-encoding", "transfer-encoding"].includes(
                key.toLowerCase(),
              )
            ) {
              return;
            }

            res.setHeader(key, value);
          });

          res.end(responseBuffer);
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              error: {
                message:
                  error instanceof Error
                    ? error.message
                    : "本地 AI 代理转发失败。",
              },
            }),
          );
        }
      });
    },
  };
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export default defineConfig({
  plugins: [vue(), createDevAiGatewayProxyPlugin()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8090",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
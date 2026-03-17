import Fastify from "fastify";

const app = Fastify();

app.get("/health", (_req, res) => {
  return { status: "ok" };
});

app.listen({ port: 3001 });

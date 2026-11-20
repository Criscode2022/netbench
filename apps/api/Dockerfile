# The API on any always-on host with Docker (build context: the repository root). Production runs on the hosting
# platform on the M6 Mac instead (HANDOFF §11); Eve is a separate process there, next to Bionic and Ollama.
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/engine ./packages/engine
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json
COPY apps/eve-agent/package.json ./apps/eve-agent/package.json
COPY sql ./sql
RUN npm install --omit=dev --workspace=@netbench/engine --workspace=@netbench/api
ENV PORT=3001 HOST=0.0.0.0 NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "@netbench/api"]

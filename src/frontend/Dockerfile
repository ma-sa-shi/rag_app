FROM node:24-slim AS base
WORKDIR /app
COPY --chown=node:node ./src/frontend/package*.json ./
RUN chown node:node /app
USER node

FROM base AS local
USER root
RUN npm install -g @anthropic-ai/claude-code
USER node
ENV APP_ENV=local
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS cloud
ENV APP_ENV=cloud
RUN npm ci
COPY --chown=node:node ./src/frontend/ /app/
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]

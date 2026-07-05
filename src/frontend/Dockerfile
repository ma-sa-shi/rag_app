FROM node:24-slim AS base
WORKDIR /app
COPY --chown=node:node ./src/frontend/package*.json ./
RUN chown node:node /app
USER node

FROM base AS local
ENV APPENV=local
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS cloud
ENV APPENV=cloud
RUN npm ci
COPY --chown=node:node ./src/frontend/ /app/
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]

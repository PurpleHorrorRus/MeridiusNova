FROM node:alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install --ignore-scripts

COPY nuxt.config.ts tsconfig.json ./
COPY app ./app
COPY server ./server
COPY public ./public
COPY i18n ./i18n
COPY locales ./locales

ARG NUXT_SESSION_PASSWORD
ARG NUXT_COOKIE_KEY
ARG DISCORD_CLIENT_ID
ARG DISCORD_CLIENT_SECRET

RUN NUXT_SESSION_PASSWORD="$NUXT_SESSION_PASSWORD" \
    NUXT_COOKIE_KEY="$NUXT_COOKIE_KEY" \
    DISCORD_CLIENT_ID="$DISCORD_CLIENT_ID" \
    DISCORD_CLIENT_SECRET="$DISCORD_CLIENT_SECRET" \
    npx nuxt build

FROM node:alpine

WORKDIR /app

COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/package*.json ./

RUN npm install --only=production --ignore-scripts && \
    npm cache clean --force

# Секреты запекаются в образ при сборке (требование проекта)
# Предупреждения Docker сканера о SecretsUsedInArgOrEnv ожидаемы и могут быть проигнорированы
ARG NUXT_SESSION_PASSWORD
ARG NUXT_COOKIE_KEY
ARG DISCORD_CLIENT_ID
ARG DISCORD_CLIENT_SECRET

ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV NUXT_SESSION_PASSWORD=$NUXT_SESSION_PASSWORD
ENV NUXT_COOKIE_KEY=$NUXT_COOKIE_KEY
ENV DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
ENV DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/healthcheck', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

CMD ["node", ".output/server/index.mjs"]
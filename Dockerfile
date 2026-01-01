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

RUN --mount=type=secret,id=NUXT_SESSION_PASSWORD,required=false \
    --mount=type=secret,id=NUXT_COOKIE_KEY,required=false \
    --mount=type=secret,id=DISCORD_CLIENT_ID,required=false \
    --mount=type=secret,id=DISCORD_CLIENT_SECRET,required=false \
    export NUXT_SESSION_PASSWORD=$(test -f /run/secrets/NUXT_SESSION_PASSWORD && cat /run/secrets/NUXT_SESSION_PASSWORD || echo "") && \
    export NUXT_COOKIE_KEY=$(test -f /run/secrets/NUXT_COOKIE_KEY && cat /run/secrets/NUXT_COOKIE_KEY || echo "") && \
    export DISCORD_CLIENT_ID=$(test -f /run/secrets/DISCORD_CLIENT_ID && cat /run/secrets/DISCORD_CLIENT_ID || echo "") && \
    export DISCORD_CLIENT_SECRET=$(test -f /run/secrets/DISCORD_CLIENT_SECRET && cat /run/secrets/DISCORD_CLIENT_SECRET || echo "") && \
    npx nuxt build

FROM node:alpine

WORKDIR /app

COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/package*.json ./

RUN npm install --only=production --ignore-scripts && \
    npm cache clean --force

USER node

ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/healthcheck', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

CMD ["node", ".output/server/index.mjs"]
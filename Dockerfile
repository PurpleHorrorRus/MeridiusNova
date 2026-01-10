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

RUN --mount=type=secret,id=NUXT_SESSION_PASSWORD \
	--mount=type=secret,id=NUXT_COOKIE_KEY \
	--mount=type=secret,id=DISCORD_CLIENT_ID \
	--mount=type=secret,id=DISCORD_CLIENT_SECRET \
	NUXT_SESSION_PASSWORD="$(cat /run/secrets/NUXT_SESSION_PASSWORD)" \
	NUXT_COOKIE_KEY="$(cat /run/secrets/NUXT_COOKIE_KEY)" \
	DISCORD_CLIENT_ID="$(cat /run/secrets/DISCORD_CLIENT_ID)" \
	DISCORD_CLIENT_SECRET="$(cat /run/secrets/DISCORD_CLIENT_SECRET)" \
    npx nuxt build

FROM node:alpine

WORKDIR /app

COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/package*.json ./

ENV NODE_ENV=production
ENV EXTERNAL_SERVER=true
ENV FFMPEG_BINARY=/usr/bin/ffmpeg

RUN apk update && \
    apk add --no-cache ffmpeg su-exec

RUN npm install --only=production --ignore-scripts && \
    npm cache clean --force

RUN mkdir -p /home/node/.meridius/.cache && \
    chown -R node:node /home/node/.meridius

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/healthcheck', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

CMD ["node", ".output/server/index.mjs"]

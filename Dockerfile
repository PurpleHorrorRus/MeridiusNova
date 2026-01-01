FROM node:alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY app server i18n locales public nuxt.config.ts tsconfig.json ./

ARG NUXT_SESSION_PASSWORD
ARG NUXT_COOKIE_KEY
ARG DISCORD_CLIENT_ID
ARG DISCORD_CLIENT_SECRET

ENV NUXT_SESSION_PASSWORD=$NUXT_SESSION_PASSWORD
ENV NUXT_COOKIE_KEY=$NUXT_COOKIE_KEY
ENV DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
ENV DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET

RUN npx nuxt build

FROM node:alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.output ./.output

EXPOSE 3000
ENV PORT=3000 NITRO_PORT=3000 NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD node -e "require('http').get('http://localhost:3000/api/healthcheck', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

CMD ["node", ".output/server/index.mjs"]
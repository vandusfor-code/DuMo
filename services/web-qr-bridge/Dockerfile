FROM node:20-bookworm-slim

# inbound-image-v0.1.1 — rebuild trigger for QR image upload

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production

CMD ["npm", "start"]

FROM node:22-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends git openssh-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare yarn@stable --activate

COPY . .

RUN yarn install --immutable

ENV OFAC_DATA_DIR=/data/ofac
VOLUME ["/data"]

RUN chmod +x common/scripts/ofac/entrypoint.sh

ENTRYPOINT ["/app/common/scripts/ofac/entrypoint.sh"]

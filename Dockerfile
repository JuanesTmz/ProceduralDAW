# Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
# SONORA en la nube — un servidor Node único: sirve la app compilada en modo
# nube y la API de los equipos (ver server/index.js). Se compila en dos
# pasos para que la imagen final lleve solo el servidor y la app ya armada.

FROM node:22-slim AS app
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:nube

FROM node:22-slim
LABEL org.opencontainers.image.title="SONORA" \
      org.opencontainers.image.authors="Juan Esteban Trillos <https://www.linkedin.com/in/juan-esteban-trillos>" \
      org.opencontainers.image.description="Diseñado y desarrollado por Juan Esteban Trillos"
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server ci --omit=dev
COPY server ./server
COPY --from=app /app/dist-nube ./dist-nube

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]

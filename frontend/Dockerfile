# Stage 1 — build (Vite)
FROM node:20-alpine AS build
WORKDIR /app

# evite copiar arquivos pesados desnecessários
COPY package.json package-lock.json* yarn.lock* ./
# preferível usar npm ci se tiver package-lock.json
RUN if [ -f package-lock.json ]; then npm ci --silent; else npm install --silent; fi

COPY . .
# garante NODE_ENV=production para builds otimizados
ENV NODE_ENV=production
RUN npm run build

# Stage 2 — runtime NGINX
FROM nginx:1.25-alpine AS production
# remove conteúdo default
RUN rm -rf /usr/share/nginx/html/*

# copia build gerado
COPY --from=build /app/dist /usr/share/nginx/html

# copia configuração custom de nginx (se existir)
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

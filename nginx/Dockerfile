FROM node:20-alpine AS build
WORKDIR /app
COPY client/package.json ./client/package.json
COPY client/package-lock.json ./client/package-lock.json
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build

FROM nginx:1.27-alpine AS runtime
COPY chat.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /var/www/chat/dist
COPY --from=build /app/client/dist /var/www/chat/dist
EXPOSE 80


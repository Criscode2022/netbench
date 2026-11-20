# The web app as an nginx image (build context: the repository root). Production is a static site on the hosting
# platform instead (HANDOFF §11).
FROM node:22-slim AS build
WORKDIR /src
COPY apps/web ./apps/web
WORKDIR /src/apps/web
RUN npm install && npm run build

FROM nginx:1.27-alpine
COPY --from=build /src/apps/web/dist/web/browser /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080

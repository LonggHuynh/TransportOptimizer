# Stage 1: Build
FROM node:14 AS build

WORKDIR /app

ARG REACT_APP_GOOGLE_MAPS_API_KEY

ENV REACT_APP_GOOGLE_MAPS_API_KEY=$REACT_APP_GOOGLE_MAPS_API_KEY

COPY package*.json ./

RUN npm install

COPY . ./

RUN npm run build


# Stage 2: Deploy
FROM nginx:1.19.0-alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

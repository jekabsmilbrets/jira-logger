FROM node:lts-gallium
ENV NODE_ENV=production

WORKDIR /home/node/app

RUN npm config set unsafe-perm true

RUN npm install -g @angular/cli@14

USER node

EXPOSE 4200

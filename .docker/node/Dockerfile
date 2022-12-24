FROM node:lts-gallium

WORKDIR /home/node/app

RUN npm config set unsafe-perm true

RUN npm install -g @angular/cli

RUN chown node:node /home/node/app

USER node

CMD npm ci --legacy-peer-deps

EXPOSE 4200

FROM node:4.3.2

RUN useradd --user-group --create-home --shell /bin/false app &&\
  npm install --global npm@3.7.5

ENV HOME=/home/app

USER app
WORKDIR $HOME/pubsub

USER root
COPY . $HOME/pubsub
RUN chown -R app:app $HOME/*
RUN npm install
RUN mkdir $HOME/env

EXPOSE 5001 5002

CMD [ "npm", "start" ]

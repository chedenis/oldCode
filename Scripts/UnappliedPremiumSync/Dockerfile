FROM node:6

ENV NODE_ENV=development

RUN apt-get -y update && apt-get -y install cron

ADD crontab /etc/cron.d/sync-job-crontab

WORKDIR /usr/src/app

COPY package.json /usr/src/app/

RUN npm install && npm cache clean && touch /var/log/cronGreenway.log

COPY scripts /usr/src/app

CMD /usr/bin/env > /root/env && cron && tail -f /var/log/cronGreenway.log
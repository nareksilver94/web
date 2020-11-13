#!/bin/bash

source ~/.bashrc
export PATH="$PATH:/home/ubuntu/.nvm/versions/node/v10.16.0/bin"

# make temp folders
mkdir -p logs && \
mkdir -p images

# copy pm2-config.json and reload pm2 process
cd /var/www/dist && \
cp /var/www/skinworld-backend/pm2-config.json . && \
npm install && \
pm2 kill && \
pm2 start pm2-config.json
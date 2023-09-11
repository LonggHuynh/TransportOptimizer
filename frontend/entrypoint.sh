#!/bin/sh

sed -i "s/__REACT_APP_GOOGLE_MAPS_API_KEY__/${REACT_APP_GOOGLE_MAPS_API_KEY}/g" /usr/share/nginx/html/config.js

nginx -g 'daemon off;'

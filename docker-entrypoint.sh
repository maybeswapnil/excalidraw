#!/bin/sh

cat <<EOF > /usr/share/nginx/html/config.js
window.EXCALIDRAW_CONFIG = {
  VITE_REMOTE_SYNC_ENDPOINT: "${VITE_REMOTE_SYNC_ENDPOINT}",
  VITE_ENABLE_REMOTE_SYNC: "${VITE_ENABLE_REMOTE_SYNC}",
};
EOF

exec nginx -g "daemon off;"

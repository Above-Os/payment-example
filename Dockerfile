FROM nginx:alpine

# Install Python 3 and VC verification dependencies via apk
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-requests \
    py3-cryptography

# Clean default assets
RUN rm -rf /usr/share/nginx/html/*

# Copy static files
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./styles.css /usr/share/nginx/html/styles.css
COPY ./main.js /usr/share/nginx/html/main.js
COPY ./olares-dog.webp /usr/share/nginx/html/olares-dog.webp

# Copy VC verification script
COPY ./verify_vc.py /verify_vc.py
RUN chmod +x /verify_vc.py

# Copy entrypoint script
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port
EXPOSE 80

# Use entrypoint script that verifies VC before starting nginx
ENTRYPOINT ["/entrypoint.sh"]



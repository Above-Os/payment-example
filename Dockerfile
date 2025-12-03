FROM nginx:alpine

# Clean default assets
RUN rm -rf /usr/share/nginx/html/*

# Copy static files
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./styles.css /usr/share/nginx/html/styles.css
COPY ./main.js /usr/share/nginx/html/main.js
COPY ./olares-dog.webp /usr/share/nginx/html/olares-dog.webp

# Expose port
EXPOSE 80

# Use default nginx configuration
CMD ["nginx", "-g", "daemon off;"]



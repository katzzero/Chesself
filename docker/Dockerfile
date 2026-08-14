# Chesself - Docker Configuration
FROM nginx:alpine

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy source files from src directory
COPY src/ /usr/share/nginx/html/

# Create nginx config
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/chesself.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

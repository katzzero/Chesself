# Chesself - Docker Configuration
FROM nginx:alpine

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy source files from src directory
COPY src/ /usr/share/nginx/html/

# Create nginx config with security headers
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
\
    root /usr/share/nginx/html; \
    index index.html; \
\
    # Security headers \
    add_header X-Content-Type-Options nosniff; \
    add_header X-Frame-Options SAMEORIGIN; \
    add_header X-XSS-Protection "1; mode=block"; \
\
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/chesself.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Chesself - Docker Configuration
# Minimal container for running chess game with AI

FROM node:20-alpine AS builder

WORKDIR /app

# Copy source files
COPY src/ ./src/

# Install dependencies (none needed - pure JS)
RUN echo "No external dependencies required"

# Production stage - serve static files
FROM nginx:alpine

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy chess game files to nginx html directory
COPY --from=builder /app/src/ /usr/share/nginx/html/

# Create custom nginx config for single page app
RUN echo 'server {\n    listen 80;\n    server_name localhost;\n\n    root /usr/share/nginx/html;\n    index index.html;\n\n    location / {\n        try_files $uri $uri/ =404;\n    }\n}' > /etc/nginx/conf.d/chesself.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
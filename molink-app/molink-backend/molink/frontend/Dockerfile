# Build stage
FROM node:20-alpine as build

WORKDIR /app

# 配置 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com/

# Copy package files
COPY package*.json ./

# Install dependencies with timeout and retry
RUN npm install --registry=https://registry.npmmirror.com/ --timeout=300000 --prefer-offline --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build --registry=https://registry.npmmirror.com/

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

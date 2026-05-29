# ==========================================
# Molink 前端 - Sealos 生产部署 Dockerfile
# ==========================================
# 构建阶段
FROM node:20-alpine AS build

WORKDIR /app

# 使用国内镜像源加速（构建时可通过 --build-arg 覆盖）
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry ${NPM_REGISTRY}

# 先复制依赖文件，利用 Docker 缓存层
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# 复制源码
COPY . .

# 注入 API 基础地址（构建参数）
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 构建应用
RUN yarn build

# ==========================================
# 生产阶段 - Nginx 托管静态文件
# ==========================================
FROM nginx:alpine

# 复制构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx-sealos.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

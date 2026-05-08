# =========================
# Backend Build Stage
# =========================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY Backend/Backend.csproj ./Backend/
RUN dotnet restore "./Backend/Backend.csproj"
COPY Backend/ ./Backend/
WORKDIR "/src/Backend"
RUN dotnet publish "./Backend.csproj" -c $BUILD_CONFIGURATION -o /app/backend /p:UseAppHost=false

# =========================
# Frontend Build Stage
# =========================
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY FrontEnd/package.json FrontEnd/package-lock.json ./
RUN npm ci
COPY FrontEnd/ ./
RUN npm run build:ssr

# =========================
# Runtime Stage
# =========================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update && apt-get install -y \
    curl \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Copy backend
COPY --from=backend-build /app/backend ./backend
# Copy frontend
COPY --from=frontend-build /app/dist ./frontend/dist
COPY --from=frontend-build /app/package.json /app/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm ci --omit=dev
# Copy i18n assets
COPY --from=frontend-build /app/dist/what-grows-native-here/browser/assets/i18n ./dist/what-grows-native-here/browser/assets/i18n
COPY --from=frontend-build /app/dist/what-grows-native-here/browser/assets/i18n ./dist/what-grows-native-here/server/assets/i18n
# Configure supervisord
WORKDIR /app
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:backend]
command=dotnet /app/backend/Backend.dll
directory=/app/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log
environment=ASPNETCORE_ENVIRONMENT="Production",ASPNETCORE_URLS="http://+:8080"

[program:frontend]
command=node dist/what-grows-native-here/server/server.mjs
directory=/app/frontend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
environment=NODE_ENV="production",PORT="4000",API_URL="http://localhost:8080"
EOF

EXPOSE 8080 4000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
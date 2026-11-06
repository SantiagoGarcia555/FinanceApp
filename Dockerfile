# Imagen única API + web (1.4.2). La API (ASP.NET Core 8) sirve también el build de React desde wwwroot,
# así web y API comparten origen y la cookie de refresh (SameSite=Strict) funciona sin dominio propio.
#
#   docker build -t financeapp .
#   docker run -p 8080:8080 -e ConnectionStrings__DefaultConnection=... -e Jwt__SecretKey=... financeapp

# ---------- 1) Web: Vite build ----------
FROM node:22-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
# Código común con la app móvil (web/src/lib/format.ts y api/types.ts lo reexportan)
COPY shared/ /src/shared/
RUN npm run build

# ---------- 2) API: dotnet publish ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS api
WORKDIR /src
COPY backend/FinanceApp.Api/FinanceApp.Api.csproj backend/FinanceApp.Api/
RUN dotnet restore backend/FinanceApp.Api/FinanceApp.Api.csproj
COPY backend/FinanceApp.Api/ backend/FinanceApp.Api/
RUN dotnet publish backend/FinanceApp.Api/FinanceApp.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# ---------- 3) Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=api /app ./
COPY --from=web /src/web/dist ./wwwroot

ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    Database__MigrateOnStartup=true

# Usuario sin privilegios que traen las imágenes oficiales de .NET 8.
USER $APP_UID

# Render inyecta PORT (por defecto 10000); en local se usa 8080.
EXPOSE 8080
CMD ["sh", "-c", "ASPNETCORE_HTTP_PORTS=${PORT:-8080} exec dotnet FinanceApp.Api.dll"]

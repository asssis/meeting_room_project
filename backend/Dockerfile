# ---------- build stage ----------
    FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
    WORKDIR /src
    
    # reduz problemas com path muito longo
    ENV NUGET_PACKAGES=/tmp/.nuget/packages
    
    # copia solution e o csproj que está na raiz
    COPY ["backend.sln", "./"]
    COPY ["MeetingRoom.Api.csproj", "./"]
    
    # restaura de forma confiável
    RUN dotnet restore "backend.sln" --disable-parallel --verbosity minimal
    
    # copia todo o código
    COPY . .
    
    # publica apontando para o csproj na raiz
    RUN dotnet publish "MeetingRoom.Api.csproj" -c Release -o /app
    
    # ---------- runtime stage ----------
    FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
    WORKDIR /app
    
    # copia artefatos publicados
    COPY --from=build /app ./
    
    # copia entrypoint (opcional — você também monta via volumes)
    COPY docker-entrypoint.sh /app/docker-entrypoint.sh
    RUN chmod +x /app/docker-entrypoint.sh
    
    EXPOSE 80
    
    ENTRYPOINT ["/bin/bash", "/app/docker-entrypoint.sh"]
    
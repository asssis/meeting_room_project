#!/usr/bin/env bash
set -e

DBFILE="/app/Data/meeting.db"
TIMEOUT=${DB_WAIT_TIMEOUT:-60}   # segundos
SLEEP_INTERVAL=1

echo "Entrypoint: aguardando arquivo DB em ${DBFILE} (timeout ${TIMEOUT}s)..."

elapsed=0
while [ ! -f "$DBFILE" ] && [ "$elapsed" -lt "$TIMEOUT" ]; do
  sleep $SLEEP_INTERVAL
  elapsed=$((elapsed + SLEEP_INTERVAL))
done

if [ ! -f "$DBFILE" ]; then
  echo "Aviso: arquivo DB não encontrado em ${DBFILE} após ${TIMEOUT}s — a API tentará iniciar mesmo assim."
else
  echo "Arquivo DB encontrado. Iniciando a aplicação."
fi

# Você pode habilitar opções extras via variáveis se quiser:
# Ex.: dotnet MyApp.dll --urls http://+:80
exec dotnet MeetingRoom.Api.dll

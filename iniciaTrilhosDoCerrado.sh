#!/bin/sh
set -eu
cd "$(dirname "$0")"
case "$(uname -s)" in
  Linux) ;;
  MINGW*|MSYS*|CYGWIN*) exec cmd.exe /d /c iniciaTrilhosDoCerrado.bat ;;
  *) printf '%s\n' 'Este inicializador é para Linux.' >&2; exit 1 ;;
esac
if [ -x ./runtime/bin/node ]; then
  node=./runtime/bin/node
elif command -v node >/dev/null 2>&1; then
  node=node
else
  printf '%s\n' 'Node.js necessário. Coloque o runtime portátil na pasta runtime ou adicione node ao PATH.' >&2
  exit 1
fi
export TRILHOS_FALLBACK=1 TRILHOS_OPEN_BROWSER=1
exec "$node" server.js "$@"

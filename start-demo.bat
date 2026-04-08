@echo off
REM Quick start script for Langfuse APRA CPS demo

echo Starting Langfuse infrastructure...
docker-compose -f docker-compose.dev.yml up -d

echo Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak >nul

echo Generating Prisma client...
cd packages/shared
call pnpm prisma generate

echo Running migrations...
call pnpm prisma migrate dev --name add_apra_cps

echo Starting development server...
cd ../../web
call pnpm dev

pause
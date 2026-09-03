FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY meridian_dbt/ ./meridian_dbt/

ENV PYTHONIOENCODING=utf-8
ENV TERM=dumb
ENV DBT_PROJECT_DIR=/app/meridian_dbt
ENV DBT_PROFILES_DIR=/app/meridian_dbt

EXPOSE 8000
{{
    config(
        materialized = 'table'
    )
}}

select
    generate_series::date as date_day
from
    generate_series(
        '2026-01-01'::date,
        '2026-12-31'::date,
        '1 day'::interval
    )
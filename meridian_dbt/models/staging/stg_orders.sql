with source as (
    select * from {{ ref('orders') }}
),

renamed as (
    select
        order_id::varchar        as order_id,
        customer_id::varchar     as customer_id,
        order_date::date         as order_date,
        revenue::numeric         as revenue,
        discount_amount::numeric as discount_amount,
        promo_code_used::int     as promo_code_used,
        channel::varchar         as channel,
        status::varchar          as status
    from source
)

select * from renamed
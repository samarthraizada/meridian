with source as (
    select * from {{ ref('customers') }}
),

renamed as (
    select
        customer_id::varchar          as customer_id,
        first_order_date::date        as first_order_date,
        acquisition_channel::varchar  as acquisition_channel,
        acquisition_cost::numeric     as acquisition_cost,
        region::varchar               as region
    from source
)

select * from renamed
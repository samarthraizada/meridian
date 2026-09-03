with orders as (
    select * from {{ ref('stg_orders') }}
),

customers as (
    select * from {{ ref('stg_customers') }}
),

final as (
    select
        o.order_id,
        o.customer_id,
        o.order_date,
        o.revenue,
        o.discount_amount,
        o.promo_code_used,
        o.channel,
        o.status,
        c.acquisition_channel,
        c.acquisition_cost,
        c.region,
        case when c.first_order_date = o.order_date then 1 else 0 end as is_new_customer
    from orders o
    left join customers c on o.customer_id = c.customer_id
)

select * from final
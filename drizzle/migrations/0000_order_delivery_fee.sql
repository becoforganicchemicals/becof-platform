-- Flat delivery fee (KES 500, free on product subtotals of KES 30,000+; see
-- src/lib/delivery.ts) is now charged at checkout as part of total_amount.
-- Store it separately so loyalty points and affiliate commission keep being
-- calculated on what was spent on products, not on delivery.
--
-- Both functions below are the latest versions from earlier migrations, with
-- only total_amount → (total_amount - delivery_fee) changed.

alter table public.orders
  add column if not exists delivery_fee numeric not null default 0
  check (delivery_fee >= 0);

create or replace function public.award_delivery_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_prior_delivered integer;
  v_already_referred integer;
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') and new.user_id is not null then

    -- Purchase points: 100 KES = 1 point (delivery fee excluded)
    insert into public.loyalty_points (user_id, points, type, order_id, description, expires_at)
    values (
      new.user_id,
      floor((new.total_amount - new.delivery_fee) / 100)::integer,
      'purchase',
      new.id,
      'Points earned — order #' || upper(substr(new.id::text, 1, 8)),
      now() + interval '1 year'
    );

    -- Referral bonus: only on the referred user's first-ever delivered order,
    -- only once per referred user (both checked explicitly, not assumed).
    select referred_by_user_id into v_referrer from public.profiles where user_id = new.user_id;

    if v_referrer is not null then
      select count(*) into v_prior_delivered from public.orders
      where user_id = new.user_id and status = 'delivered' and id <> new.id;

      select count(*) into v_already_referred from public.loyalty_points
      where type = 'referral' and referred_user_id = new.user_id;

      if v_prior_delivered = 0 and v_already_referred = 0 then
        insert into public.loyalty_points (user_id, points, type, referred_user_id, description, expires_at)
        values (v_referrer, 500, 'referral', new.user_id, 'Referral bonus — your friend completed their first order', now() + interval '1 year');
      end if;
    end if;

  end if;
  return new;
end;
$$;

create or replace function public.award_affiliate_commission()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_affiliate record;
begin
  if new.affiliate_id is not null
     and new.status = 'delivered' and new.payment_status = 'paid'
     and not (old.status = 'delivered' and old.payment_status = 'paid') then

    select * into v_affiliate from public.affiliates where id = new.affiliate_id and status = 'approved';
    if found then
      -- Commission on products only (delivery fee excluded)
      insert into public.affiliate_commissions (affiliate_id, order_id, order_total, commission_rate, commission_amount, status)
      values (
        v_affiliate.id, new.id, new.total_amount - new.delivery_fee, v_affiliate.commission_rate,
        round((new.total_amount - new.delivery_fee) * v_affiliate.commission_rate, 2), 'payable'
      )
      on conflict (order_id) do nothing;
    end if;
  end if;

  if new.status in ('cancelled', 'refunded') and old.status not in ('cancelled', 'refunded') then
    update public.affiliate_commissions set status = 'void' where order_id = new.id and status = 'payable';
  end if;

  return new;
end;
$$;
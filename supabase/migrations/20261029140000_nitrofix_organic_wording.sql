-- NitroFix FAQ wording: no approval claim until certification is in place.

update public.products set
  long_description = replace(long_description,
    'NitroFix contains only natural, live bacteria and is approved for use in organic farming systems.',
    'NitroFix contains only natural, live bacteria and is suitable for organic farming systems.')
where slug = 'becof-nitrofix';

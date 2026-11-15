alter table inventory_items
  add column if not exists studio_image_thumb text not null default '';
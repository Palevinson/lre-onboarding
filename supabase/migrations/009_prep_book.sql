-- ============================================================================
-- Add 'Practical Real Estate Practices' reference doc
-- ----------------------------------------------------------------------------
-- Tara's book. New 'training' category groups this and any future training
-- resources separately from Process Guides / Checklists / etc.
-- ============================================================================

insert into reference_docs (slug, title, category, sort_order, content)
values (
  'prep-book',
  'Practical Real Estate Practices (PREP)',
  'training',
  10,
  E'## About this book\n\n*Practical Real Estate Practices* — written by Peter Levinson — is a working reference for new and experienced LRE agents. Use it as a companion to your training: open it when a specific situation comes up, not as a textbook to read end-to-end.\n\n## Get your copy\n\n- **[Read on Apple Books](https://books.apple.com/us/book/prep-practical-real-estate-practices/id6737492208)** — digital edition (iPhone, iPad, or Mac)\n- **[Buy paperback on Amazon](https://a.co/d/02iumA8d)** — print edition'
)
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  sort_order = excluded.sort_order,
  content = excluded.content,
  updated_at = now();

-- PostgreSQL requires this enum value to be committed before a later migration uses it.
alter type creator_user_role add value if not exists 'designer';

-- Notes have no templates (F006): a note is text, a day and tags. Text, dates and tag links stay.
ALTER TABLE notes DROP COLUMN template;

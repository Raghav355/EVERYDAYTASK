/*
# Update default booking status to new

Changes the default status on new bookings from 'assigned' to 'new' so the admin
lifecycle (new -> accepted -> assigned -> on_the_way -> in_progress -> completed) starts correctly.
*/

ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'new';

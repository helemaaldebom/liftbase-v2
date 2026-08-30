/*
  # Make bedrag column nullable in bids table

  1. Changes
    - Alter `bedrag` column in bids table to allow NULL values
    - This allows creating bid invitations without a pre-filled amount
    - Dealers can then fill in their own bid amount via the email link

  2. Notes
    - Existing bids with amounts will remain unchanged
    - New bids can be created without an amount when sending invitations
*/

ALTER TABLE bids ALTER COLUMN bedrag DROP NOT NULL;

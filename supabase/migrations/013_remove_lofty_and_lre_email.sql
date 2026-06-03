-- ============================================================================
-- Remove Lofty CRM and LRE Email from the onboarding portal
-- ----------------------------------------------------------------------------
-- LRE no longer uses Lofty as the brokerage CRM and no longer issues LRE
-- email addresses as an add-on. Remove the corresponding tasks, references,
-- and contact descriptions so they don't show up anywhere.
-- ============================================================================

-- 1. Delete the standalone Welcome Week tasks
delete from task_templates where title = 'Added to Lofty CRM';
delete from task_templates where title = 'Assign LRE email address';

-- 2. Remove "Lofty" from the Tuesday trainings description
update task_templates
set description = 'Contract, Dotloop, and MLS @ 11a'
where title = 'Attend Tuesday trainings';

-- 3. Update Kaylee's role description (LRE email removed; mailbox stays)
update team_contacts
set description = 'Mailbox assignment for new agents.'
where name = 'Kaylee';

-- 4. Rewrite the platform-access reference doc — drop the Lofty section
update reference_docs
set content = E'### 1. Dotloop Access\nEmail **ambassador@LRErealty.com** with subject **"Dotloop Access"**. Include:\n- Your full name spelling (as you want it on contracts)\n- The email address you use for writing offers\n\nDotloop is the platform LRE provides at no charge to write, send, and manage contracts.\n\n### 2. Office Rental\nOffice space is available at **$300/month**. Email **leadership@LRErealty.com** with subject **"Office Rental"**.',
    updated_at = now()
where slug = 'platform-access';

-- 5. Rewrite the a-la-carte reference doc — drop the LRE Email line
update reference_docs
set content = E'Optional add-on services for your business:\n\n- **Transaction Management** — $250/transaction. Contract-to-close including TRR negotiations. Paid at closing.\n- **Monthly Runner Service** — $200/month. Earnest money to title, closing-packet pickup, individual client delivery (no pop-bys), lockbox and/or sign pickup.\n- **Standard Office Rental** — $300/month. 24hr access, conference room (2hr/mo), full gym, 2 reserved lockers, copy machines, break room, kitchen, coffee shop. Video & podcast rooms coming soon.\n- **Marketing Material Creation** — $50/month. Consultation + 3 revisions. Single-page or social-media ad created in Canva, shared with your Canva account.\n- **Photography & Editing** — Full home photos $150 · Drone photo+video $75 · VR tour (Matterport) $100.',
    updated_at = now()
where slug = 'a-la-carte';

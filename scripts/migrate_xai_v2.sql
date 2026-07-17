-- EmotiSense XAI v2 Migration
-- Adds ig_attributions column for faithful attribution storage
-- Migrates "excited" emotion labels to "happy" (5-class merge)

ALTER TABLE xai_results ADD COLUMN ig_attributions TEXT;

UPDATE emotion_logs SET emotion = 'happy' WHERE emotion = 'excited';
UPDATE emotion_logs SET probabilities = REPLACE(probabilities, '"excited"', '"happy"') WHERE emotion = 'happy' AND probabilities LIKE '%"excited"%';

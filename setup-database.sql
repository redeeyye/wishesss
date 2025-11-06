CREATE TABLE IF NOT EXISTS birthday_wishes (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE birthday_wishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert wishes" ON birthday_wishes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read wishes" ON birthday_wishes
    FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_birthday_wishes_timestamp 
ON birthday_wishes(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_birthday_wishes_name 
ON birthday_wishes(name);

INSERT INTO birthday_wishes (name, message) VALUES 
('Vansh', 'Hbd veessssnavi'),
('redeye', 'Happy Birthday Vaishnavi! Hope you have an amazing day! 🎉'),
('piyush', 'Happy Birthday to the most wonderful person! May all your dreams come true! ✨');

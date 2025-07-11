-- Create the birthday_wishes table for Anugya
CREATE TABLE IF NOT EXISTS birthday_wishes (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE birthday_wishes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert wishes
CREATE POLICY "Anyone can insert wishes" ON birthday_wishes
    FOR INSERT WITH CHECK (true);

-- Create policy to allow anyone to read wishes (for admin download)
CREATE POLICY "Anyone can read wishes" ON birthday_wishes
    FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_birthday_wishes_timestamp 
ON birthday_wishes(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_birthday_wishes_name 
ON birthday_wishes(name);

-- Add some sample data for Anugya
INSERT INTO birthday_wishes (name, message) VALUES 
('Vansh', 'Hbd veessssnavi'),
('Arjun', 'Happy Birthday Anugya! Hope you have an amazing day! 🎉'),
('Priya', 'Wishing you all the happiness in the world on your special day! 💖'),
('Redeye', 'Happy Birthday to the most wonderful person! May all your dreams come true! ✨');

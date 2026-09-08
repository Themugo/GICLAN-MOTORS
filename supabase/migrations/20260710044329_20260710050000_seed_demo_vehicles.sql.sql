/*
# Seed Demo Vehicles

Inserts sample vehicle listings directly into the database.
These vehicles are visible on the public marketplace immediately.
dealer_id is left NULL since these are demo listings without a specific dealer.
When real dealers sign up and list cars, their vehicles will reference their auth user ID.
*/

INSERT INTO public.cars (
  title, brand, model, year, fuel, transmission, body_type, mileage, color,
  engine, condition, price, description, features, images, location_city,
  auction_status, auction_end, current_bid, bids_count, allow_bid, allow_buy,
  is_promoted, is_verified_dealer, deal_rating, approved
) VALUES

(
  'Toyota Land Cruiser V8', 'Toyota', 'Land Cruiser', 2021, 'Diesel', 'Automatic', 'SUV',
  45000, 'Pearl White', '4.5L V8 Turbo Diesel', 'Used', 3200000,
  'Excellent condition Toyota Land Cruiser V8. Locally used, fully loaded. Perfect for both city driving and off-road adventures.',
  ARRAY['Leather Seats', 'Sunroof', 'DVD Entertainment', '4x4', 'Reverse Camera', 'Alloy Wheels', 'Climate Control', 'Cruise Control'],
  ARRAY['https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800', 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nairobi', 'ended', NULL, 0, 0, false, true, true, true, 'great', true
),
(
  'Mercedes-Benz GLE 350d', 'Mercedes', 'GLE', 2022, 'Diesel', 'Automatic', 'SUV',
  22000, 'Obsidian Black', '3.0L Turbo Diesel', 'Used', 12000000,
  'Stunning Mercedes-Benz GLE 350d with full service history. Panoramic sunroof, heated/ventilated seats, and Burmester audio system.',
  ARRAY['Panoramic Sunroof', 'Burmester Audio', 'Heated Seats', 'Air Suspension', 'Night Vision', 'Parking Pilot', 'Head-Up Display'],
  ARRAY['https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg?auto=compress&cs=tinysrgb&w=800', 'https://images.pexels.com/photos/1007410/pexels-photo-1007410.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nairobi', 'live', now() + INTERVAL '48 hours', 11200000, 14, true, false, true, true, 'good', true
),
(
  'BMW X5 M Sport', 'BMW', 'X5', 2021, 'Petrol', 'Automatic', 'SUV',
  38000, 'Carbon Black', '3.0L B58 Turbocharged', 'Used', 9500000,
  'BMW X5 M Sport in pristine condition. Full BMW service history, M Sport package with adaptive M suspension.',
  ARRAY['M Sport Package', 'Harman Kardon', 'Panoramic Sunroof', 'Adaptive Cruise Control', 'Wireless Charging', 'Gesture Control'],
  ARRAY['https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nairobi', 'ended', NULL, 0, 0, false, true, true, true, 'fair', true
),
(
  'Land Rover Defender 110', 'Land Rover', 'Defender', 2022, 'Petrol', 'Automatic', 'SUV',
  18000, 'Fuji White', '2.0L P300 Turbocharged', 'Used', 8600000,
  'The iconic Land Rover Defender 110 P300 in exceptional condition. Only 18,000km, one owner, all service at Land Rover dealer.',
  ARRAY['Terrain Response 2', 'Air Suspension', 'Wade Sensing', 'Configurable Terrain', 'Pro Off-Road Assistance'],
  ARRAY['https://images.pexels.com/photos/2127733/pexels-photo-2127733.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nairobi', 'live', now() + INTERVAL '24 hours', 8800000, 7, true, false, true, true, 'good', true
),
(
  'Toyota Land Cruiser Prado TX', 'Toyota', 'Prado', 2020, 'Diesel', 'Automatic', 'SUV',
  55000, 'Silver Metallic', '2.8L 1GD-FTV Diesel', 'Used', 4800000,
  'Toyota Prado TX in excellent condition. 7-seater with 3rd row fold-flat seats. Fully serviced at Toyota Kenya.',
  ARRAY['7 Seater', 'Multi-Terrain Select', 'DAC', 'Pre-Collision System', 'Lane Departure Alert', 'Blind Spot Monitor'],
  ARRAY['https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Mombasa', 'ended', NULL, 0, 0, false, true, true, true, 'great', true
),
(
  'Subaru Outback 3.6R', 'Subaru', 'Outback', 2019, 'Petrol', 'Automatic', 'SUV',
  62000, 'Crystal White', '3.6L DOHC', 'Used', 3200000,
  'Subaru Outback 3.6R with Eyesight driver assist. Full AWD, roof rails, X-Mode for light off-roading.',
  ARRAY['EyeSight Driver Assist', 'Full AWD', 'X-Mode', 'Roof Rails', 'Heated Front Seats', 'Rear Camera'],
  ARRAY['https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nairobi', 'ended', NULL, 0, 0, false, true, false, true, 'fair', true
),
(
  'Mazda CX-5 Skyactiv', 'Mazda', 'CX-5', 2022, 'Petrol', 'Automatic', 'SUV',
  21000, 'Soul Red Crystal', '2.0L Skyactiv-G', 'Used', 3600000,
  'Mazda CX-5 with the exclusive Soul Red Crystal paint. Low mileage, one careful owner. Connected features and Mazda Safety Bundle.',
  ARRAY['Mazda Safety Bundle', 'BOSE Audio', 'Heads-Up Display', 'Smart City Brake Support', 'Traffic Sign Recognition'],
  ARRAY['https://images.pexels.com/photos/1035108/pexels-photo-1035108.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Kisumu', 'ended', NULL, 0, 0, false, true, false, true, 'good', true
),
(
  'Porsche Cayenne S', 'Porsche', 'Cayenne', 2020, 'Petrol', 'Automatic', 'SUV',
  31000, 'Jet Black Metallic', '2.9L Twin-Turbo V6', 'Used', 14500000,
  'Porsche Cayenne S with sport chrono package. Air suspension, PCM infotainment, panoramic sunroof. Serviced at Porsche Centre.',
  ARRAY['Sport Chrono Package', 'Air Suspension', 'Surround View Camera', 'Lane Change Assist', 'Porsche InnoDrive'],
  ARRAY['https://images.pexels.com/photos/3764984/pexels-photo-3764984.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nairobi', 'live', now() + INTERVAL '12 hours', 13200000, 9, true, false, true, true, 'overpriced', true
),
(
  'Toyota Hilux Double Cab', 'Toyota', 'Hilux', 2021, 'Diesel', 'Automatic', 'Pickup',
  48000, 'Silver', '2.8L 1GD-FTV Diesel', 'Used', 3800000,
  'Toyota Hilux 2.8 GD-6 Double Cab 4x4 in excellent condition. Perfect for business and off-road use. Canopy included.',
  ARRAY['Canopy', '4x4 Low Range', 'Trailer Assist', 'Pre-Collision System', '7-Inch Touchscreen', 'Apple CarPlay'],
  ARRAY['https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nakuru', 'ended', NULL, 0, 0, false, true, false, true, 'great', true
),
(
  'Honda CR-V Turbo AWD', 'Honda', 'CR-V', 2021, 'Petrol', 'Automatic', 'SUV',
  29000, 'Aegean Blue', '1.5L Turbocharged', 'Used', 3100000,
  'Honda CR-V Turbo AWD in superb condition. Adaptive cruise control, Honda Sensing safety suite, hands-free power tailgate.',
  ARRAY['Honda Sensing', 'Adaptive Cruise Control', 'Power Tailgate', 'Wireless Charging', 'Navigation', 'Ventilated Front Seats'],
  ARRAY['https://images.pexels.com/photos/1149137/pexels-photo-1149137.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nairobi', 'ended', NULL, 0, 0, false, true, false, true, 'fair', true
),
(
  'Audi Q7 55 TFSI Quattro', 'Audi', 'Q7', 2020, 'Petrol', 'Automatic', 'SUV',
  42000, 'Daytona Grey', '3.0L TFSI V6', 'Used', 10200000,
  'Audi Q7 with quattro all-wheel drive. Full Audi service history. Virtual cockpit, Bang & Olufsen 3D audio, matrix LED headlights.',
  ARRAY['Virtual Cockpit', 'Bang & Olufsen 3D', 'Matrix LED', 'Quattro AWD', 'Air Suspension', 'Night Vision Assist'],
  ARRAY['https://images.pexels.com/photos/244206/pexels-photo-244206.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nairobi', 'ended', NULL, 0, 0, false, true, true, true, 'good', true
),
(
  'Volkswagen Tiguan R-Line', 'Volkswagen', 'Tiguan', 2022, 'Petrol', 'Automatic', 'SUV',
  14000, 'Candy White', '2.0L TSI 4Motion', 'Used', 4200000,
  'VW Tiguan R-Line 4Motion brand new specification. Virtual cockpit, DCC adaptive chassis, discover pro navigation.',
  ARRAY['R-Line Package', 'DCC Adaptive Chassis', 'Virtual Cockpit', '360-Degree Camera', 'Travel Assist', 'Wireless App Connect'],
  ARRAY['https://images.pexels.com/photos/12801/pexels-photo-12801.jpeg?auto=compress&cs=tinysrgb&w=800'],
  'Nairobi', 'ended', NULL, 0, 0, false, true, false, true, 'good', true
)
ON CONFLICT DO NOTHING;

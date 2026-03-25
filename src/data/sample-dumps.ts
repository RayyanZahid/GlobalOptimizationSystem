export const SAMPLE_BANK_STATEMENT = `Chase Bank - Monthly Statement - February 2026
Account: ***4821 | Rayyan Zahid

02/01  Rent Payment - Islamabad Heights Apt      PKR 45,000
02/02  K-Electric - Electricity Bill               PKR  4,200
02/03  Sui Northern Gas                            PKR  1,800
02/04  Imtiaz Super Market - Groceries             PKR  8,500
02/05  Shell Petrol Station - Fuel                 PKR  6,000
02/07  Daraz.pk - Electronics (USB-C Hub)          PKR  3,200
02/08  Careem Ride - Office commute                PKR    450
02/10  McDonald's - Lunch                          PKR  1,200
02/11  Jazz Monthly Internet - 150 Mbps            PKR  3,500
02/12  Amazon.com - Programming Books              PKR  5,400
02/14  Imtiaz Super Market - Groceries             PKR  7,200
02/15  Freelance Income (Upwork)                  +PKR 85,000
02/16  Foodpanda - Dinner delivery                 PKR  1,800
02/18  Shell Petrol Station - Fuel                 PKR  5,500
02/19  Netflix Subscription                        PKR  1,500
02/20  Khaadi - Clothing                           PKR  4,800
02/21  Imtiaz Super Market - Groceries             PKR  6,300
02/22  Mobilink Microfinance - Savings Transfer    PKR 20,000
02/24  Careem Ride                                 PKR    550
02/25  TCS Courier - Package shipping              PKR    800
02/26  Foodpanda - Lunch delivery                  PKR  1,100
02/27  Spotify Premium                             PKR    500
02/28  GitHub Pro Subscription                     PKR  1,200

Monthly Total Spending: PKR 130,500 (~$465 USD)
Monthly Income: PKR 85,000 (~$303 USD)`;

export const SAMPLE_GROCERY_RECEIPT = `Imtiaz Super Market - Islamabad
Receipt #4821-0214  |  Feb 14, 2026

Basmati Rice (5 kg bag)          PKR 1,200
Chicken Breast (1 kg)            PKR   680
Eggs - 12 pack                   PKR   350
Whole Wheat Atta (2 kg)          PKR   280
Cooking Oil - Dalda (1 L)        PKR   520
Onions (2 kg)                    PKR   180
Tomatoes (1 kg)                  PKR   200
Potatoes (3 kg)                  PKR   270
Bananas (1 dozen)                PKR   150
Milk - Olpers (1.5 L)           PKR   350
Yogurt - Nurpur (500g)          PKR   180
Green Chilies (250g)            PKR    60
Garlic (250g)                   PKR   120
Ginger (200g)                   PKR    80
Lentils - Masoor Dal (1 kg)     PKR   350
Chickpeas - Chana (1 kg)        PKR   320
Tea - Tapal Danedar (250g)      PKR   280
Sugar (1 kg)                    PKR   180
Naan Bread (6 pcs)              PKR   120
Bottled Water (6 x 1.5L)        PKR   300

Subtotal:                       PKR 5,670
Tax:                            PKR   330
TOTAL:                          PKR 6,000

Payment: Debit Card ***4821`;

export const SAMPLE_HOME_DESCRIPTION = `2-bedroom apartment in Islamabad, Pakistan (F-10 sector)
~900 sq ft, 3rd floor of a 6-story reinforced concrete building
Built in 2015

Construction: Reinforced concrete frame with brick infill walls
Exterior: Plastered brick with some decorative stone cladding
Windows: Single-pane aluminum frame windows (8 total)
Flooring: Ceramic tile throughout, marble in bathroom
Roof: Shared concrete slab roof (flat)

Heating/Cooling: 2x split AC units (Haier 1.5 ton each), no central heating
Water: Municipal supply + 500L rooftop tank, gas geyser for hot water
Cooking: Natural gas (Sui Northern pipeline)
Electricity: K-Electric grid connection, no solar

Fixtures: Basic bathroom fixtures (Pakistani-made), LED lighting throughout
Balcony: Small 6x4 ft concrete balcony with iron railing
Parking: Shared basement parking spot`;

export const SAMPLE_DEVICE_LIST = `My devices:

1. Dell Inspiron 15 laptop (2023) - used for freelance development work
2. Samsung Galaxy S23 - primary phone
3. Xiaomi Redmi tablet - reading and media
4. Generic 32" LCD TV - Samsung (2019)
5. TP-Link WiFi Router
6. Logitech wireless keyboard + mouse combo
7. Sony WH-1000XM4 headphones
8. 1TB Western Digital external hard drive
9. Anker 20000mAh power bank
10. Brother laser printer (shared with roommate)
11. Xiaomi Mi Band 7 fitness tracker
12. USB-C hub / dock (generic)`;

export type SampleDataType = 'bank' | 'receipt' | 'home' | 'devices';

export const SAMPLE_DATA: Record<SampleDataType, { label: string; data: string }> = {
  bank: { label: 'Sample Bank Statement', data: SAMPLE_BANK_STATEMENT },
  receipt: { label: 'Sample Grocery Receipt', data: SAMPLE_GROCERY_RECEIPT },
  home: { label: 'Sample Home Description', data: SAMPLE_HOME_DESCRIPTION },
  devices: { label: 'Sample Device List', data: SAMPLE_DEVICE_LIST },
};

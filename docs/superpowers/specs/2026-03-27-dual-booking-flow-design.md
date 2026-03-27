# Dual Booking Flow — WhatsApp + Online Checkout

## Summary

Replace the single "Continue to Checkout" button on the car detail page with two options: "Pay & Reserve Online" (Stripe checkout) and "Reserve via WhatsApp" (pre-filled WhatsApp message). Add pickup/return time selectors. Generate confirmation numbers for online payments. Create a standalone reservation confirmation page.

## 1. Booking Widget Changes (car-detail.html)

### Time Selectors
Add a pickup time and return time dropdown below each date picker. Options in 30-minute intervals from 8:00 AM to 8:00 PM. Default pickup: 10:00 AM. Default return: 10:00 AM.

### Dual Buttons
Replace the single "Continue to Checkout" button with two side-by-side buttons:

- **"Pay & Reserve Online"** — primary filled button. Submits the form to `checkout.html` with all params: car ID, dates, times, location, add-ons.
- **"Reserve via WhatsApp"** — outline button with WhatsApp icon. Opens `wa.me` link with pre-filled message containing: car make/model, pickup date+time, return date+time, location, selected add-ons, estimated total.

Both buttons validate that dates are selected before proceeding. Times have defaults so they don't block submission.

## 2. Checkout Flow Updates (checkout.html)

### Pass-through Times
The checkout page reads `start_time` and `end_time` from URL params and displays them in the order summary. These values are included when creating the Stripe checkout session / payment intent.

### Confirmation Step (Step 4)
After successful payment, Step 4 shows:
- Confirmation number (format: `EPD-YYYYMMDD-XXXX`)
- Car make, model, and image
- Pickup: date + time + location
- Return: date + time
- Add-ons selected
- Total paid
- Link to permanent reservation page: `/reservation.html?id=EPD-...`
- "Print" button for receipt

## 3. Confirmation Number Generation

### Server-side (stripe-webhook.js)
When the Stripe webhook receives a `checkout.session.completed` or `payment_intent.succeeded` event:
1. Generate confirmation number: `EPD-YYYYMMDD-XXXX` where YYYY-MM-DD is the current date and XXXX is a random 4-character alphanumeric string (uppercase).
2. Insert or update the reservation in the `reservations` table with the confirmation number.
3. Store: car_id, customer info, pickup_date, pickup_time, return_date, return_time, location, add-ons, total, stripe_payment_id, confirmation_number, status='confirmed'.

### Uniqueness
If a generated confirmation number collides (unlikely with 4 alphanumeric chars per day), retry with a new random suffix up to 3 times.

## 4. Reservation Confirmation Page (reservation.html)

### New standalone page at `/reservation.html?id=EPD-YYYYMMDD-XXXX`
Fetches reservation from Supabase by confirmation_number. Displays:
- Confirmation number (prominent, large)
- Status badge (Confirmed / Pending / Cancelled)
- Car details: make, model, year, image
- Pickup: date, time, location
- Return: date, time
- Add-ons
- Total paid
- Contact info (WhatsApp link for questions)
- Print/save button

### Error states
- Invalid/missing confirmation number: "Reservation not found" message with link back to homepage
- No URL param: redirect to homepage

### Styling
Matches existing site design (same navbar, footer, CSS). Clean, receipt-style layout.

## 5. Calendar Availability Verification

Verify that the Flatpickr date picker on car-detail.html integrates with `blocked_dates` and `reservations` tables to disable already-booked dates. If this integration is missing or broken, implement it:
- Fetch blocked dates + confirmed reservation date ranges for the specific car
- Pass them to Flatpickr's `disable` option
- Visually indicate unavailable dates (greyed out)

## 6. Data Flow

```
User selects dates/times/add-ons on car-detail.html
        |
    [WhatsApp]                    [Pay Online]
        |                              |
  Opens wa.me with              Navigates to checkout.html
  pre-filled message            with all params in URL
        |                              |
   (done - manual               Stripe payment flow
    follow-up)                         |
                                stripe-webhook.js
                                generates EPD-YYYYMMDD-XXXX
                                inserts reservation in DB
                                       |
                                checkout.html Step 4
                                shows confirmation
                                       |
                                reservation.html?id=EPD-...
                                permanent shareable page
```

## 7. Files Changed

- `car-detail.html` — add time selectors, dual buttons
- `js/fleet.js` — update `initBookingForm()` for dual submission logic
- `checkout.html` — read/display times, show confirmation number in Step 4
- `netlify/functions/stripe-webhook.js` — generate confirmation number, store reservation
- `reservation.html` — new page for viewing reservation by confirmation number
- `css/style.css` — styles for time selectors, dual buttons, reservation page

## 8. Database Requirements

The `reservations` table needs these columns (verify exist, add if missing):
- `confirmation_number` (text, unique)
- `pickup_time` (text, e.g. "10:00")
- `return_time` (text, e.g. "10:00")
- `pickup_location` (text)
- `addons` (jsonb or text)
- `total_amount` (numeric)
- `stripe_payment_id` (text)
- `status` (text: confirmed, pending, cancelled)

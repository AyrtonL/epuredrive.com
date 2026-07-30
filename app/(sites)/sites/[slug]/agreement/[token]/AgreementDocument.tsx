'use client'

import type React from 'react'
import Image from 'next/image'
import type { ReservationExtra } from '@/lib/supabase/types'

export interface AgreementCar {
  make: string
  model: string
  model_full: string | null
  year: number | null
  vin: string | null
  transmission: string | null
  color: string | null
  plate: string | null
}

export interface AgreementTenantInfo {
  logo_url: string | null
  company_address: string | null
  company_phone: string | null
  agreement_clauses: string | null
}

export interface AgreementReservation {
  id: number
  booking_code?: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_dob: string | null
  customer_address: string | null
  customer_zip: string | null
  extras: ReservationExtra[] | null
  pickup_date: string | null
  pickup_time: string | null
  return_date: string | null
  return_time: string | null
  pickup_location: string | null
  return_location: string | null
  total_amount: number | null
  security_deposit: number | null
  surcharge: number | null
  amount_outstanding: number | null
  odometer_out: number | null
  odometer_in: number | null
  fuel_out: string | null
  fuel_in: string | null
  license_number: string | null
  license_state: string | null
  license_expiration_date: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
  insurance_expiration_date: string | null
  damage_checkin: string | null
  damage_checkout: string | null
  // tenant counter-signature
  tenant_signed_at: string | null
  tenant_signature_url: string | null
  tenant_signed_by: string | null
}

interface Props {
  reservation: AgreementReservation
  tenant: AgreementTenantInfo
  car: AgreementCar | null
  tenantName: string
  accentColor: string
  signatureSlot: React.ReactNode
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function formatDateTime(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr) return '—'
  const date = formatDate(dateStr)
  if (!timeStr) return date
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${date} — ${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

function renderCarColor(color: string | null): React.ReactNode {
  if (!color) return '—'
  const trimmed = color.trim()
  if (!HEX_COLOR_RE.test(trimmed)) return trimmed
  return (
    <span
      className="inline-block w-5 h-5 rounded-full border border-gray-300 align-middle"
      style={{ backgroundColor: trimmed }}
      title={trimmed}
    />
  )
}

export default function AgreementDocument({
  reservation,
  tenant,
  car,
  tenantName,
  accentColor,
  signatureSlot,
}: Props) {
  const days =
    reservation.pickup_date && reservation.return_date
      ? Math.ceil(
          (new Date(reservation.return_date).getTime() - new Date(reservation.pickup_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null

  return (
    <>
      {/* Header */}
      <div className="p-8 border-b-4" style={{ borderColor: accentColor }}>
        <div className="flex justify-between items-start">
          <div>
            {tenant.logo_url && (
              <Image src={tenant.logo_url} alt={tenantName} width={120} height={56} className="h-14 w-auto object-contain mb-3" />
            )}
            <div className="font-black text-xl text-gray-900 tracking-wide">{tenantName}</div>
            {tenant.company_address && (
              <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">{tenant.company_address}</div>
            )}
            {tenant.company_phone && (
              <div className="text-xs text-gray-500">{tenant.company_phone}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-black uppercase tracking-widest text-gray-900">Rental Agreement</div>
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <div>Agreement #: <strong>{reservation.booking_code || `RA-${reservation.id.toString().padStart(4, '0')}`}</strong></div>
              <div>Date: <strong>{new Date().toLocaleDateString('en-US')}</strong></div>
              {days && <div>Period: <strong>{days} day{days !== 1 ? 's' : ''}</strong></div>}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6 text-sm text-gray-800">

        {/* Reservation Summary */}
        <section>
          <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
            Reservation Summary
          </div>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4 whitespace-nowrap">Pickup Location</td>
                <td className="border border-gray-200 px-3 py-2">{reservation.pickup_location || '—'}</td>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Return Location</td>
                <td className="border border-gray-200 px-3 py-2">{reservation.return_location || reservation.pickup_location || '—'}</td>
              </tr>
              <tr>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Date &amp; Time Out</td>
                <td className="border border-gray-200 px-3 py-2">{formatDateTime(reservation.pickup_date, reservation.pickup_time)}</td>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Date &amp; Time Due</td>
                <td className="border border-gray-200 px-3 py-2">{formatDateTime(reservation.return_date, reservation.return_time)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Vehicle Information */}
        {car && (
          <section>
            <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
              Vehicle Information
            </div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Brand &amp; Model</td>
                  <td className="border border-gray-200 px-3 py-2">{car.make} {car.model_full || car.model}</td>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Year</td>
                  <td className="border border-gray-200 px-3 py-2">{car.year || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Color</td>
                  <td className="border border-gray-200 px-3 py-2">{renderCarColor(car.color)}</td>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Plate</td>
                  <td className="border border-gray-200 px-3 py-2">{car.plate || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">VIN Number</td>
                  <td className="border border-gray-200 px-3 py-2 font-mono text-xs">{car.vin || '—'}</td>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Transmission</td>
                  <td className="border border-gray-200 px-3 py-2">{car.transmission || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Odometer Out</td>
                  <td className="border border-gray-200 px-3 py-2">{reservation.odometer_out != null ? reservation.odometer_out.toLocaleString() : '—'}</td>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Odometer In</td>
                  <td className="border border-gray-200 px-3 py-2">{reservation.odometer_in != null ? reservation.odometer_in.toLocaleString() : '—'}</td>
                </tr>
                <tr>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Fuel Out</td>
                  <td className="border border-gray-200 px-3 py-2">{reservation.fuel_out || '—'}</td>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Fuel In</td>
                  <td className="border border-gray-200 px-3 py-2">{reservation.fuel_in || '—'}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Renter Information */}
        <section>
          <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
            Renter Information
          </div>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Full Name</td>
                <td className="border border-gray-200 px-3 py-2">{reservation.customer_name || '—'}</td>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Phone</td>
                <td className="border border-gray-200 px-3 py-2">{reservation.customer_phone || '—'}</td>
              </tr>
              <tr>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Email</td>
                <td className="border border-gray-200 px-3 py-2">{reservation.customer_email || '—'}</td>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Date of Birth</td>
                <td className="border border-gray-200 px-3 py-2">{reservation.customer_dob ? formatDate(reservation.customer_dob) : '—'}</td>
              </tr>
              <tr>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">License #</td>
                <td className="border border-gray-200 px-3 py-2">
                  {reservation.license_number || '—'}
                  {reservation.license_state && ` (${reservation.license_state})`}
                </td>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">License Expires</td>
                <td className="border border-gray-200 px-3 py-2">
                  {reservation.license_expiration_date ? formatDate(reservation.license_expiration_date) : '—'}
                </td>
              </tr>
              <tr>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Address</td>
                <td className="border border-gray-200 px-3 py-2">{reservation.customer_address || '—'}</td>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">ZIP Code</td>
                <td className="border border-gray-200 px-3 py-2">{reservation.customer_zip || '—'}</td>
              </tr>
              {(reservation.insurance_provider ||
                reservation.insurance_policy_number ||
                reservation.insurance_expiration_date) && (
                <tr>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Insurance</td>
                  <td className="border border-gray-200 px-3 py-2">
                    {reservation.insurance_provider || '—'}
                    {reservation.insurance_policy_number && ` — Policy: ${reservation.insurance_policy_number}`}
                  </td>
                  <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Insurance Expires</td>
                  <td className="border border-gray-200 px-3 py-2">
                    {reservation.insurance_expiration_date ? formatDate(reservation.insurance_expiration_date) : '—'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Charges */}
        {reservation.total_amount && (
          <section>
            <div className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded mb-3 text-black" style={{ background: accentColor }}>
              Charge Information
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1">
              <div className="flex justify-between py-1.5 border-b border-gray-200">
                <span className="text-gray-600">Rental ({days || '?'} day{days !== 1 ? 's' : ''})</span>
                <span className="font-medium">${reservation.total_amount.toLocaleString()}</span>
              </div>
              {(reservation.extras ?? []).map((extra) => (
                <div key={extra.extra_id} className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">
                    {extra.name}
                    {extra.pricing_type === 'per_day' && ` (${extra.quantity} day${extra.quantity !== 1 ? 's' : ''} @ $${extra.unit_price})`}
                  </span>
                  <span className="font-medium">${extra.subtotal.toLocaleString()}</span>
                </div>
              ))}
              {reservation.surcharge != null && (
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">Surcharge</span>
                  <span className="font-medium">${reservation.surcharge.toLocaleString()}</span>
                </div>
              )}
              {reservation.security_deposit != null && (
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-medium">${reservation.security_deposit.toLocaleString()}</span>
                </div>
              )}
              {reservation.amount_outstanding != null && (
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">Amount Outstanding</span>
                  <span className="font-medium">${reservation.amount_outstanding.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 font-black text-base border-t-2 border-gray-800 mt-1">
                <span>TOTAL</span>
                <span style={{ color: accentColor }}>${reservation.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </section>
        )}

        {/* Damage Report */}
        <section>
          <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
            Damage Report
          </div>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4 align-top">Check-In</td>
                <td className="border border-gray-200 px-3 py-2 min-h-[60px] whitespace-pre-line">
                  {reservation.damage_checkin || <span className="text-gray-400 italic">No damage noted at check-in</span>}
                </td>
              </tr>
              <tr>
                <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 align-top">Check-Out</td>
                <td className="border border-gray-200 px-3 py-2 min-h-[60px] whitespace-pre-line">
                  {reservation.damage_checkout || <span className="text-gray-400 italic">To be completed at return</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Terms & Conditions */}
        <section>
          <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
            Terms &amp; Conditions
          </div>
          <div className="text-[11px] text-gray-600 leading-relaxed space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p><strong>1. DEFINITIONS.</strong> &quot;Agreement&quot; means all terms and conditions in this rental record and any documents you sign at the time of rental. &quot;You,&quot; &quot;Your&quot; or &quot;Renter&quot; means each person signing this Agreement, each Authorized Driver, and any person or organization to whom charges are billed at your direction. &quot;We,&quot; &quot;Our&quot; or &quot;Us&quot; means {tenantName}. &quot;Authorized Driver&quot; means the Renter and any additional driver we list on this Agreement, each of whom must be at least 21 years old and hold a valid driver&apos;s license. &quot;Vehicle&quot; means the automobile identified in this Agreement and all its tires, tools, accessories, equipment, keys and documents. &quot;Loss of Use&quot; means our lost ability to use the Vehicle while it is damaged or being repaired. &quot;Diminution of Value&quot; means the reduction in the Vehicle&apos;s market value after damage and repair.</p>
            <p><strong>2. RENTAL; INDEMNITY; PERSONAL PROPERTY; WARRANTIES.</strong> Only Authorized Drivers may operate the Vehicle. You may not sublease the Vehicle. We may repossess the Vehicle at your expense, without notice where permitted by law, if it is abandoned or used in violation of law or this Agreement. You agree to indemnify, defend and hold us harmless from all claims, liability, costs and attorney fees arising from this rental or your use of the Vehicle. We are not responsible for loss of or damage to personal property left in or on the Vehicle. We make no warranties, express or implied, regarding the Vehicle, including any warranty of merchantability or fitness for a particular purpose.</p>
            <p><strong>3. CONDITION &amp; RETURN OF VEHICLE.</strong> Rental of the Vehicle constitutes a bailment for your benefit. You must return the Vehicle to the location and by the date and time stated in this Agreement, in the same condition received except for ordinary wear. Our determination of the Vehicle&apos;s condition is subject to a final inspection, which may occur after drop-off whether or not the Vehicle is checked in by an employee. To extend the rental you must contact us before the due-in date and obtain our written approval; charges continue to accrue until the Vehicle is returned. You must maintain all fluid levels, immediately notify us of any warning lights, overheating, leaks or mechanical issues, and may not perform service or authorize repairs without our prior approval.</p>
            <p><strong>4. RESPONSIBILITY FOR DAMAGE OR LOSS.</strong> Regardless of fault, you are responsible for all damage to, loss of, or theft of the Vehicle during the rental period from any cause, including collision, weather, vandalism, and acts of nature. Your responsibility includes: (a) the cost of repair, or if the Vehicle is a total loss, its fair market value less salvage; (b) Diminution of Value; (c) Loss of Use, measured by the daily rental rate multiplied by the number of days the Vehicle is unavailable, payable regardless of fleet utilization; (d) an administrative fee based on the damage amount ($50 for damage up to $500, $100 up to $1,500, $200 up to $2,500, and $250 over $2,500); and (e) towing, storage, and all collection and enforcement costs including attorney fees. You must report all damage, accidents, theft and vandalism to us and to the police as soon as you discover them.</p>
            <p><strong>5. PROHIBITED USES.</strong> The Vehicle shall not be used: (a) by anyone who is not an Authorized Driver or whose license is suspended; (b) by anyone under the influence of drugs or alcohol; (c) by anyone who gave us false or misleading information; (d) for any illegal purpose; (e) to carry persons or property for hire; (f) to push or tow anything; (g) in any race, speed test or contest; (h) to teach anyone to drive; (i) to carry hazardous or illegal materials; (j) outside the State of Florida unless authorized by us in writing; (k) on unpaved roads; (l) to carry more persons than there are seat belts, or children without approved safety seats; (m) while the odometer is disconnected or tampered with; (n) while sending or reading a text or email; or (o) in any willful, wanton or reckless manner. Smoking or vaping in the Vehicle is prohibited. Any prohibited use is a material breach that terminates the rental and voids any coverage product where permitted by law.</p>
            <p><strong>6. INSURANCE &amp; RESPONSIBILITY.</strong> We do not provide automatic insurance coverage with this Agreement unless it is specifically purchased and shown on the rental record. You are fully responsible for any damage, loss, theft, Loss of Use, Diminution of Value, towing and administrative fees, regardless of fault, unless optional coverage has been purchased. If you rely on your own insurance or credit-card benefits, it is solely your responsibility to verify that they apply, and we are not responsible if such coverage is declined. If optional coverage is purchased from us, a deductible applies: $1,000 for vehicles valued under $35,000 and $2,500 for vehicles valued at $35,000 or more. Coverage is void if this Agreement is breached.</p>
            <p><strong>7. ACCIDENTS &amp; INCIDENTS.</strong> You are responsible for all injury, damage or loss you cause to yourself and others, including passengers. You must (a) report all accidents to us and the police as soon as they occur; (b) complete our incident report form; and (c) provide us any legal papers you receive relating to the incident. Failure to report is a material breach and may void optional coverage. We reserve the right to subrogate against you for any amount we must pay to injured or damaged parties. The Vehicle may not be taken into Mexico under any circumstances.</p>
            <p><strong>8. PAYMENT &amp; CHARGES.</strong> You will pay us all charges under this Agreement, including without limitation: the time and mileage charges shown; optional product and service fees; fuel and refueling fees; applicable taxes and surcharges; a reasonable cleaning fee; towing and storage; a 2% per-month late-payment fee (or the maximum permitted by law); a $50 fee for any returned payment; costs we incur locating or recovering the Vehicle; and attorney fees and court costs we incur enforcing this Agreement. All charges are subject to a final audit, and you authorize us to correct any errors with your payment-card issuer.</p>
            <p><strong>9. TOLLS &amp; TRAFFIC VIOLATIONS.</strong> You are responsible for all tolls, parking citations, photo-enforcement fees, fines and other violations assessed against you, us or the Vehicle during the rental. If we pay any toll or violation on your behalf, you authorize us to charge the amount plus an administrative fee of $35 per occurrence to your payment card.</p>
            <p><strong>10. FUEL POLICY.</strong> The Vehicle will be returned with at least the same fuel level as at pickup. A refueling fee of $10 plus the cost of fuel will be charged if the Vehicle is returned with less fuel.</p>
            <p><strong>11. MILEAGE.</strong> The rental includes the mileage allowance stated in this Agreement. Miles driven beyond that allowance will be charged at the overage rate specified above, billed at return. Unlimited-mileage agreements are subject to fair use within the rental period.</p>
            <p><strong>12. LATE RETURN &amp; EXTENSIONS.</strong> Vehicles returned more than 2 hours late without an approved extension will be charged an additional day&apos;s rental rate for each day or partial day after the due-in time, plus any applicable surcharge for returning the Vehicle to a different location.</p>
            <p><strong>13. CANCELLATION.</strong> Cancellations made more than 48 hours before pickup are fully refundable. Cancellations within 48 hours may be subject to a one-day charge. Once the rental period begins and the Vehicle is made available, charges are governed by Section 15.</p>
            <p><strong>14. PERSONAL INFORMATION; COMMUNICATIONS.</strong> You agree that we may disclose your information to law enforcement or third parties in connection with enforcing this Agreement, and that we, our assignees, or collection agencies may contact you by phone (including wireless numbers and automated dialing), text, or email at any number or address you provide, to service the account or recover amounts owed.</p>
            <p><strong>15. CHARGEBACKS; NO REFUND FOR NON-USE.</strong> By signing this Agreement and/or accepting the Vehicle, you agree that all rental charges, deposits and fees are valid, earned and non-cancellable once the rental period begins and the Vehicle is made available to you. Claiming the Vehicle was not used, not driven, or returned early does not cancel this Agreement or eliminate your financial responsibility, because the Vehicle was reserved and held exclusively for you. You agree not to dispute or charge back any valid charge. If you initiate a chargeback for a valid charge, it constitutes a material breach and we may pursue recovery of the disputed amount plus administrative, bank-dispute, collection and attorney fees.</p>
            <p><strong>16. SMOKING; CLEANING &amp; DECONTAMINATION FEE.</strong> Smoking, vaping, or use of tobacco or cannabis inside the Vehicle is strictly prohibited. If there is any evidence of smoking — odor, ash, residue, burns or stains — a cleaning and decontamination fee of $250 to $500 may be charged to the payment card on file or deducted from the security deposit. You agree this fee is a reasonable estimate of cleaning cost and Loss of Use and is non-refundable.</p>
            <p><strong>17. SECURITY DEPOSIT &amp; PAYMENT AUTHORIZATION.</strong> You authorize us to place a hold or collect a security deposit before or at the start of the rental, which may be retained in whole or part for damage, smoking, excessive cleaning, unpaid tolls or violations, late return, extra mileage, fuel shortage, or other charges under this Agreement. The deposit is not a limit on your liability. By providing a payment card you represent that you are the cardholder or are authorized to use it, and you authorize charges processed after the rental period for damage, Loss of Use, tolls, violations, and the fees described in this Agreement, including where a third-party card is used.</p>
            <p><strong>18. DAMAGE PRE-AUTHORIZATION; EVIDENCE OF RENTAL.</strong> You authorize us to place a pre-authorization hold and to charge the payment card on file up to the estimated cost of repair, Loss of Use and related fees based on a repair estimate or third-party assessment. You acknowledge that the signed Agreement, photographs and video of the Vehicle and your identification, GPS and telematics data, and time-stamped delivery records may be used as conclusive evidence that the rental service was provided and authorized in the event of any dispute or chargeback.</p>
            <p><strong>19. HIGH-PERFORMANCE USE; MISUSE FEE.</strong> Burnouts, drifting, racing, speed contests, launch-control abuse, and operation at excessive speed are strictly prohibited. If we determine through GPS, telemetry, video or other reasonable evidence that the Vehicle was misused, a misuse fee of $500 to $1,000 may be charged in addition to any damage or Loss of Use charges.</p>
            <p><strong>20. PERSONAL PROPERTY; GPS &amp; TELEMATICS.</strong> We are not responsible for loss of or damage to personal property left in or on the Vehicle; property left for more than 30 days may be disposed of at our discretion, and you should erase any personal data from the Vehicle&apos;s systems before returning it. The Vehicle may be equipped with GPS, telematics, or event-data recorders, and you acknowledge and authorize remote monitoring — including location, odometer, fuel level, and diagnostic data — which we may use to enforce this Agreement. You agree to inform all drivers and passengers of this provision.</p>
            <p><strong>21. GOVERNING LAW; MISCELLANEOUS.</strong> This Agreement is governed by the laws of the State of Florida, and the parties consent to the jurisdiction of the courts located there. No term may be waived or modified except in a writing signed by us. This Agreement is the entire agreement between the parties; all prior representations are void. If any provision is held void or unenforceable, the remaining provisions remain valid. To the extent permitted by law, you and we each waive the right to a trial by jury in any proceeding arising out of this Agreement.</p>
            {tenant.agreement_clauses && (
              <div className="pt-2 border-t border-gray-200 whitespace-pre-line">
                {tenant.agreement_clauses}
              </div>
            )}
          </div>
        </section>

        {/* Renter Signature Section */}
        <section>
          <div className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded mb-3 text-black" style={{ background: accentColor }}>
            Renter Signature
          </div>
          {signatureSlot}
        </section>

        {/* Operator Counter-Signature Section */}
        <section>
          <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
            Operator Signature — Close Out
          </div>
          {reservation.tenant_signed_at && reservation.tenant_signature_url ? (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  Signed by <strong>{reservation.tenant_signed_by || 'Operator'}</strong> on{' '}
                  {new Date(reservation.tenant_signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reservation.tenant_signature_url}
                alt="Operator signature"
                className="h-16 object-contain"
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <p className="text-gray-400 text-sm italic">Pending operator signature at vehicle return</p>
            </div>
          )}
        </section>

      </div>
    </>
  )
}

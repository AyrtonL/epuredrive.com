// Shared dark-glass theme for react-day-picker, used by DateRangePicker (public
// booking site) and DatePicker (dashboard). Keeps both calendars visually
// identical without duplicating the CSS block.
export const DARK_DAYPICKER_CSS = `
  .rdp-root {
    --rdp-accent-color: rgba(255,255,255,0.2);
    --rdp-accent-background-color: rgba(255,255,255,0.2);
    --rdp-background-color: rgba(255,255,255,0.06);
    --rdp-day-font: inherit;
    --rdp-range_start-color: white;
    --rdp-range_end-color: white;
    --rdp-range_start-background: white;
    --rdp-range_end-background: white;
    --rdp-range_middle-background-color: rgba(255,255,255,0.18);
    --rdp-range_middle-color: #fff;
    --rdp-selected-color: black;
    --rdp-selected-font: inherit;
    color: rgba(255,255,255,0.9);
    font-size: 0.8rem;
  }
  .rdp-root * { box-sizing: border-box; }
  .rdp-month_caption {
    color: white;
    font-size: 0.7rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .rdp-weekday {
    color: rgba(255,255,255,0.35);
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding-bottom: 8px;
  }
  .rdp-day_button {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    font-size: 0.78rem;
    font-weight: 600;
    transition: background 0.15s, color 0.15s;
  }
  .rdp-day_button:hover:not([disabled]) {
    background: rgba(255,255,255,0.12);
    color: white;
  }
  .rdp-selected .rdp-day_button {
    background: white !important;
    color: black !important;
    font-weight: 800;
    border-radius: 10px;
  }
  .rdp-range_middle .rdp-day_button,
  .rdp-selected.rdp-range_middle .rdp-day_button {
    background: rgba(255,255,255,0.18) !important;
    color: #ffffff !important;
    font-weight: 700;
    border-radius: 0 !important;
  }
  .rdp-range_start .rdp-day_button,
  .rdp-selected.rdp-range_start .rdp-day_button {
    background: white !important;
    color: black !important;
    border-radius: 10px 0 0 10px !important;
    font-weight: 800;
  }
  .rdp-range_end .rdp-day_button,
  .rdp-selected.rdp-range_end .rdp-day_button {
    background: white !important;
    color: black !important;
    border-radius: 0 10px 10px 0 !important;
    font-weight: 800;
  }
  .rdp-range_start.rdp-range_end .rdp-day_button {
    border-radius: 10px !important;
  }
  .rdp-day[aria-disabled="true"] .rdp-day_button {
    color: rgba(255,255,255,0.25);
    text-decoration: line-through;
    cursor: not-allowed;
  }
  .rdp-today:not(.rdp-selected) .rdp-day_button {
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
  }
  .rdp-nav button {
    color: rgba(255,255,255,0.4);
    background: none;
    border: none;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .rdp-nav button:hover {
    color: white;
    background: rgba(255,255,255,0.1);
  }
  .rdp-outside .rdp-day_button { opacity: 0; pointer-events: none; }
`

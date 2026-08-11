// Temporary diagnostic — reports the outbound IP this Netlify Function egresses from.
// Used to determine the value for Intuit's "Tell us where your app is hosted" IP field.
// Safe to delete after use.
exports.handler = async () => {
  const res = await fetch('https://api.ipify.org?format=json');
  const data = await res.json();
  return { statusCode: 200, body: JSON.stringify(data) };
};

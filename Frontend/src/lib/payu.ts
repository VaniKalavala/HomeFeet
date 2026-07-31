// Submits a hidden form POST to PayU's hosted checkout page, navigating the browser away.
// PayU has no in-page widget (unlike Razorpay) - the params here (key, txnid, hash, etc.)
// come straight from the backend order-creation response and must be posted as-is.
export function submitPayuForm(payuUrl: string, params: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payuUrl;

  Object.entries(params).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

(async () => {
  const inputs = [...document.querySelectorAll('.pin-row input')]
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  for (let i = 0; i < 4; i += 1) {
    setter.call(inputs[i], '3131'[i])
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  await new Promise((resolve) => setTimeout(resolve, 1100))
  return JSON.stringify({
    gate: Boolean(document.querySelector('.gate-page')),
    auth: Boolean(document.querySelector('.auth-card')),
    title: document.title,
  })
})()

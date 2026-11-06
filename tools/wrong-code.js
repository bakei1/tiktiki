(async () => {
  const inputs = [...document.querySelectorAll('.pin-row input')]
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  for (let i = 0; i < 4; i += 1) {
    setter.call(inputs[i], '0000'[i])
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 80))
  }
  await new Promise((resolve) => setTimeout(resolve, 200))
  return JSON.stringify({
    error: document.querySelector('.gate-error')?.textContent || null,
    shaking: document.querySelector('.pin-row')?.classList.contains('is-shaking'),
    gate: Boolean(document.querySelector('.gate-page')),
  })
})()

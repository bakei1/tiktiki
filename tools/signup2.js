(async () => {
  const inputs = [...document.querySelectorAll('.pin-row input')]
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  for (let i = 0; i < 4; i += 1) {
    setter.call(inputs[i], '3131'[i])
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  await new Promise((resolve) => setTimeout(resolve, 900))
  document.querySelector('.auth-mode-toggle')?.click()
  await new Promise((resolve) => setTimeout(resolve, 900))
  return JSON.stringify({
    warning: document.querySelector('.auth-message.is-warning')?.innerText || null,
    link: document.querySelector('.auth-message.is-warning a')?.href || null,
  })
})()

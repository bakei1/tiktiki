(async () => {
  const email = document.querySelector('input[type="email"]')
  const password = document.querySelector('input[type="password"]')
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(email, 'does-not-exist-tik@example.com')
  email.dispatchEvent(new Event('input', { bubbles: true }))
  setter.call(password, 'not-a-real-password-123')
  password.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise((resolve) => setTimeout(resolve, 120))
  document.querySelector('.auth-submit').click()
  await new Promise((resolve) => setTimeout(resolve, 1800))
  return JSON.stringify({
    error: document.querySelector('.auth-message.is-error')?.innerText || null,
    auth: Boolean(document.querySelector('.auth-card')),
    signup: Boolean(document.querySelector('input[autocomplete="username"]')),
  })
})()

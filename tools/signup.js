(async () => {
  document.querySelector('.auth-mode-toggle').click()
  await new Promise((resolve) => setTimeout(resolve, 900))
  return JSON.stringify({
    signup: Boolean(document.querySelector('input[autocomplete="username"]')),
    warning: document.querySelector('.auth-message.is-warning')?.innerText || null,
    labels: [...document.querySelectorAll('.auth-card .field-label')].map((node) =>
      node.textContent.trim(),
    ),
  })
})()

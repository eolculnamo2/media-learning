export function goToSection(id: string) {
  const heading = document.getElementById(`${id}-heading`)
  if (!heading) return
  // Primary navigation wraps on narrow screens; account for its actual height.
  const navBottom = document.querySelector('.top-nav')?.getBoundingClientRect().bottom ?? 0
  const top = window.scrollY + heading.getBoundingClientRect().top - navBottom - 20
  heading.focus({ preventScroll: true })
  window.scrollTo({ top, behavior: 'instant' })
}

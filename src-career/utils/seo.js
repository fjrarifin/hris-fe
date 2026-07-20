const siteUrl = (import.meta.env.VITE_CAREER_SITE_URL || window.location.origin).replace(/\/$/, '')
const companyName = import.meta.env.VITE_COMPANY_NAME || 'Hompim Play'

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
}

export function setSeo({ title, description, path = '/', robots = 'index,follow', jsonLd, image }) {
  const fullTitle = `${title} | Karir ${companyName}`
  const url = `${siteUrl}${path}`
  const imageUrl = image ? `${siteUrl}${image}` : `${siteUrl}/hompimplay_icon.png`

  document.title = fullTitle
  setMeta('meta[name="description"]', { name: 'description', content: description })
  setMeta('meta[name="robots"]', { name: 'robots', content: robots })
  setMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle })
  setMeta('meta[property="og:description"]', { property: 'og:description', content: description })
  setMeta('meta[property="og:type"]', {
    property: 'og:type',
    content: jsonLd ? 'article' : 'website',
  })
  setMeta('meta[property="og:url"]', { property: 'og:url', content: url })
  setMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl })
  setMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '512' })
  setMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '512' })
  setMeta('meta[property="og:image:alt"]', {
    property: 'og:image:alt',
    content: `${title} | Career ${companyName}`,
  })
  setMeta('meta[property="og:site_name"]', {
    property: 'og:site_name',
    content: `Career ${companyName}`,
  })
  setMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'id_ID' })

  setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
  setMeta('meta[name="twitter:site"]', { name: 'twitter:site', content: '@hompimplay' })
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle })
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl })

  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = url
  document.querySelectorAll('script[data-career-jsonld]').forEach((node) => node.remove())
  if (jsonLd) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.careerJsonld = 'true'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)
  }
}

export { companyName, siteUrl }

interface UserAgentBrand {
  brand: string
  version: string
}

interface UserAgentDataLike {
  brands?: UserAgentBrand[]
  mobile?: boolean
  platform?: string
}

function clean(value: string): string {
  return value
    .replace(/[^A-Za-z0-9 .()+_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function browserFromBrands(brands: UserAgentBrand[] | undefined): string {
  if (!brands?.length) return ''
  const candidates = [
    ['Microsoft Edge', 'Edge'],
    ['Google Chrome', 'Chrome'],
    ['Opera', 'Opera'],
    ['Chromium', 'Chromium'],
  ] as const
  for (const [brandName, displayName] of candidates) {
    const brand = brands.find((item) => item.brand === brandName)
    if (brand) return `${displayName} ${brand.version.split('.')[0]}`
  }
  return ''
}

function browserFromUserAgent(userAgent: string): string {
  const candidates: Array<[RegExp, string]> = [
    [/EdgA?\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/SamsungBrowser\/(\d+)/, 'Samsung Browser'],
    [/CriOS\/(\d+)/, 'Chrome'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/FxiOS\/(\d+)/, 'Firefox'],
    [/Firefox\/(\d+)/, 'Firefox'],
    [/Version\/(\d+).+Safari\//, 'Safari'],
  ]
  for (const [pattern, name] of candidates) {
    const match = userAgent.match(pattern)
    if (match?.[1]) return `${name} ${match[1]}`
  }
  return 'Web Browser'
}

function operatingSystem(userAgent: string, platform = ''): string {
  const android = userAgent.match(/Android\s+([\d.]+)/i)
  if (android?.[1]) return `Android ${android[1]}`

  const ios = userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS)\s([\d_]+)/i)
  if (ios?.[1]) return `iOS ${ios[1].replaceAll('_', '.')}`

  const macOS = userAgent.match(/Mac OS X\s([\d_]+)/i)
  if (macOS?.[1]) return `macOS ${macOS[1].replaceAll('_', '.')}`

  if (/Windows/i.test(userAgent) || /Windows/i.test(platform)) return 'Windows'
  if (/CrOS/i.test(userAgent) || /Chrome OS/i.test(platform)) return 'Chrome OS'
  if (/Linux/i.test(userAgent) || /Linux/i.test(platform)) return 'Linux'
  return clean(platform) || 'Unknown OS'
}

function deviceClass(userAgent: string, mobileHint = false): string {
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) return 'Tablet'
  if (mobileHint || /Mobi|Android|iPhone|iPod/i.test(userAgent)) return 'Mobile'
  return 'Desktop'
}

export function deviceName(): string {
  if (typeof navigator === 'undefined') return 'Web Browser / Unknown OS / Desktop'

  const browserNavigator = navigator as Navigator & { userAgentData?: UserAgentDataLike }
  const userAgent = browserNavigator.userAgent || ''
  const userAgentData = browserNavigator.userAgentData
  const browser = browserFromBrands(userAgentData?.brands) || browserFromUserAgent(userAgent)
  const os = operatingSystem(userAgent, userAgentData?.platform || browserNavigator.platform)
  const device = deviceClass(userAgent, Boolean(userAgentData?.mobile))

  return [browser, os, device].map(clean).filter(Boolean).join(' / ').slice(0, 120)
}

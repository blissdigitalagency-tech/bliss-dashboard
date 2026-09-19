export const PACKAGE_OPTIONS = [
  'DMS Google Ads',
  'DMS Meta Ads',
  'DMS TikTok',
  'DMS Pinterest',
  'Content Creation',
  'Social Media Management',
  'Website Creation',
  'KOL Management',
  'Branding',
]

export const PACKAGE_BADGE_CLASS = {
  'DMS Google Ads': 'badge-success',
  'DMS Meta Ads': 'badge-blue',
  'DMS TikTok': 'badge-inactive',
  'DMS Pinterest': 'badge-error',
  'Content Creation': 'badge-purple',
  'Social Media Management': 'badge-teal',
  'Website Creation': 'badge-indigo',
  'KOL Management': 'badge-pink',
  Branding: 'badge-warning',
}

export function packageBadgeClass(pkg) {
  return PACKAGE_BADGE_CLASS[pkg] || 'badge-inactive'
}

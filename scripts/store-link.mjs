// App Store links carry Apple campaign tokens so App Store Connect reports
// downloads per website placement. `pt` is the provider ID; `ct` is at most 40 characters.
export const storeUrl = 'https://apps.apple.com/app/louppe/id6820131477';
export const providerToken = '128797295';

export function campaignStoreUrl(campaign) {
  if (!/^[a-z0-9-]{1,40}$/.test(campaign)) throw new Error(`Invalid App Store campaign: ${campaign}`);
  return `${storeUrl}?pt=${providerToken}&ct=${campaign}&mt=12`;
}

// Tags plain store links in rendered HTML attributes; structured data keeps the plain URL.
export function tagStoreLinks(html, campaign) {
  return html.replaceAll(`href="${storeUrl}"`, `href="${campaignStoreUrl(campaign).replaceAll('&', '&amp;')}"`);
}

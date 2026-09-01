import * as Counterscale from '@counterscale/tracker'

export default defineNuxtPlugin(() => {
  Counterscale.init({
    siteId: window.location.hostname,
    reporterUrl: '/cntrsclc', // Proxy to https://analytics.jednadvacet.org/collect, so ad-blockers will not block it
  })

  const trackSubscriptionGuide = () => Counterscale.trackPageview({ url: '/kalendar/subscription-guide' })
  const trackSmsIntent = () => Counterscale.trackPageview({ url: '/kalendar/signin-sms' })
  const trackEmailIntent = () => Counterscale.trackPageview({ url: '/kalendar/signin-mail' })
  const trackWebIntent = () => Counterscale.trackPageview({ url: '/kalendar/signin-web' })
  const trackICalendarCopy = () => Counterscale.trackPageview({ url: '/kalendar/copy-ical' })

  return {
    provide: {
      counterscale: {
        trackSubscriptionGuide,
        trackSmsIntent,
        trackEmailIntent,
        trackWebIntent,
        trackICalendarCopy,
      },
    },
  }
})

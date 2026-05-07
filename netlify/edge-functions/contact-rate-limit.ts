type ContactRateLimitContext = {
  next: () => Promise<Response>;
};

export default function handler(_request: Request, context: ContactRateLimitContext) {
  return context.next();
}

export const config = {
  path: '/api/contact',
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};

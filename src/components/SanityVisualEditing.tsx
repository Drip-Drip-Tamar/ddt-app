import { useEffect, useState } from 'react';
import { enableVisualEditing } from '@sanity/visual-editing';

interface Props {
  token?: string;
}

export function SanityVisualEditing({ token }: Props) {
  const [isInPresentation, setIsInPresentation] = useState(false);

  useEffect(() => {
    // Check if we're in an iframe and have the Sanity preview parameter
    const inIframe = window.self !== window.top;
    const hasSanityPreview = new URLSearchParams(window.location.search).has('SANITY_PREVIEW_DRAFTS');
    
    // Only activate if we're in Sanity Studio's Presentation tool
    // This prevents conflicts with Stackbit visual editing
    if (inIframe && hasSanityPreview) {
      setIsInPresentation(true);
      
      // Enable Sanity visual editing
      const cleanup = enableVisualEditing({
        history: {
          subscribe: (navigate) => {
            const handleRouteChange = (event: PopStateEvent) => {
              navigate({
                type: 'push',
                url: window.location.href,
              });
            };
            window.addEventListener('popstate', handleRouteChange);
            return () => window.removeEventListener('popstate', handleRouteChange);
          },
          update: (update) => {
            if (update.type === 'push' || update.type === 'replace') {
              window.history[update.type === 'push' ? 'pushState' : 'replaceState'](
                {},
                '',
                update.url
              );
            }
          },
        },
      });

      return () => {
        cleanup();
      };
    }
  }, [token]);

  // Only render a status indicator in development
  if (import.meta.env.DEV && isInPresentation) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
        Sanity Visual Editing Active
      </div>
    );
  }

  return null;
}
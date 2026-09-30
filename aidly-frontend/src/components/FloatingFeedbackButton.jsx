import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import useIsMobile from '../hooks/useIsMobile';

// Sentry's floating "Report a Bug" button - desktop only. On phones it sat on
// top of buttons and form fields, so there the sidebar menu has a "Report a
// bug" item instead (see Sidebar). No-op when Sentry isn't configured.
export default function FloatingFeedbackButton() {
  const isMobile = useIsMobile();

  useEffect(() => {
    const feedback = Sentry.getFeedback();
    if (!feedback || isMobile) return undefined;
    const actor = feedback.createWidget();
    return () => actor.removeFromDom();
  }, [isMobile]);

  return null;
}

import { fireEvent, screen } from '@testing-library/react';

/**
 * `AppModal` (react-responsive-modal) leaves the DOM only when its fade-out
 * animation ends. jsdom runs no animations, and React listens to the prefixed
 * event name there, as jsdom styles have no `animation` property.
 */
export function endModalFadeOut(): void {
  fireEvent(screen.getByRole('dialog'), new Event('webkitAnimationEnd', { bubbles: true }));
}

/* Single-step, idempotent intro state. Animation is presentation, never a navigation gate. */
export type WelcomeStep = 'welcome' | 'form';
export function enterAuthForm(step: WelcomeStep): WelcomeStep {
  return step === 'welcome' ? 'form' : step;
}

export type MorphRect = { left: number; top: number; width: number; height: number };
export function morphTransform(from: MorphRect, to: MorphRect) {
  return {
    x: to.left + to.width / 2 - (from.left + from.width / 2),
    y: to.top + to.height / 2 - (from.top + from.height / 2),
    scaleX: to.width / Math.max(1, from.width),
    scaleY: to.height / Math.max(1, from.height),
  };
}

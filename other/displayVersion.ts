/**/
export function displayVersionInfo() {
  if (process.env.NODE_ENV === 'test') return;
  // For the browser console only: the build loads this module in every worker.
  if (typeof window === 'undefined') return;

  try {
    const styles = [
      'color: royalBlue',
      'font-size: 14px',
      'font-weight: 600'
    ].join(';');

    console.log(`%c -*{( Kirtan Site )}*-`, styles);
    console.log(JSON.stringify(__BUILD_INFO__, null, 2));
  } catch {
    console.log('No build info given.');
  }
}

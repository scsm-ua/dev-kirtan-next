/**/
export function displayVersionInfo() {
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

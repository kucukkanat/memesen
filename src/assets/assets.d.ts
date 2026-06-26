// Bun bundles these imports to served URL strings; type them as such for tsc.
declare module '*.png' {
  const url: string;
  export default url;
}
declare module '*.gif' {
  const url: string;
  export default url;
}
declare module '*.mp3' {
  const url: string;
  export default url;
}

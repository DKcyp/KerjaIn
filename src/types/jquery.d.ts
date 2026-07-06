declare module 'jquery' {
  const jQuery: any;
  export default jQuery;
}

declare global {
  interface JQuery {
    select2?: any;
  }
}

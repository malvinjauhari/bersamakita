// Ambient module declarations previously provided by vite/client types.
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

interface ImportMeta {
  readonly env: { readonly [key: string]: string | undefined };
}

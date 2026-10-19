export declare const ANALYTICS_SCRIPT: string;
export declare const ANALYTICS_CONNECT: string;
export interface HeadersOptions {
  /** Allow the Cloudflare Web Analytics beacon. Default true. */
  analytics?: boolean;
  /** More sources per directive, added to the defaults: `{ 'img-src': ['https://images.example.com'] }`. */
  extra?: Record<string, string[]>;
}
export function directives(options?: HeadersOptions): Record<string, string[]>;
export function csp(options?: HeadersOptions): string;
export function headersFile(options?: HeadersOptions): string;

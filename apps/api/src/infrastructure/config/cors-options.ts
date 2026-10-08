export const CORS_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export function corsOptions(origins: true | readonly string[]) {
  return {
    origin: origins === true ? true : [...origins],
    methods: [...CORS_METHODS],
  };
}

// types/swagger-ui-react.d.ts
declare module 'swagger-ui-react' {
  import * as React from 'react';

  export interface SwaggerUIProps {
    spec?: Record<string, any>;
    url?: string;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    [key: string]: any;
  }

  const SwaggerUI: React.FC<SwaggerUIProps>;
  export default SwaggerUI;
}
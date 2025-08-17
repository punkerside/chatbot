import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

// Configuración del proveedor para Amazon Bedrock
export const bedrock = createAmazonBedrock({
  region: import.meta.env.VITE_AWS_REGION,
});

// Configuración para usar con el API Gateway
export const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};
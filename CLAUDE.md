# ChatBot

## Propósito
Plataforma de ChatBot que usara Amazon Bedrock para poder interactuar con el modelo de Claude Sonnet 4.

## Stack Técnico
- Frontend (SPA): React 19 + TypeScript + Vite 7 + Tailwind CSS + shadcn/ui + ai-sdk (ai-elements)
- API (backend): Python 3.13

## Arquitectura
- Frontend: AWS CloudFront + S3
- API: AWS API Gateway + AWS Lambda

## Estructura de directorios
- `api/`: codigo de la funcion lambda
- `terraform/`: codigo de iac para toda la plataforma
- `ui/`: codigo del Frontend (SPA)

## Comandos Clave
- `make apply` - crear/actualizar infraestructura

## Estándares del Proyecto
- Se debe utilizar shadcn/ui y ai-elements para el Chat y sus componentes 
- Usar TypeScript estricto
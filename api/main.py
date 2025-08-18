import json
import logging
import os
import base64
from typing import Dict, List, Any, Union

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    # Headers CORS estándar para todas las respuestas
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Max-Age': '86400'
    }
    
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        logger.info(f"HTTP Method: {event.get('httpMethod')}")
        logger.info(f"Headers: {event.get('headers', {})}")
        
        # Manejar preflight OPTIONS request
        http_method = event.get('httpMethod', '').upper()
        if http_method == 'OPTIONS':
            logger.info("Handling OPTIONS preflight request")
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': ''
            }
        
        if http_method != 'POST':
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    **cors_headers
                },
                'body': json.dumps({'error': 'Method not allowed'})
            }
        
        body = json.loads(event.get('body', '{}'))
        messages = body.get('messages', [])
        
        if not messages:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    **cors_headers
                },
                'body': json.dumps({'error': 'Messages array is required'})
            }
        
        response_content = handle_chat_completion(messages)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                **cors_headers
            },
            'body': json.dumps({
                'choices': [{
                    'message': {
                        'role': 'assistant',
                        'content': response_content
                    },
                    'finish_reason': 'stop'
                }],
                'usage': {
                    'prompt_tokens': 0,
                    'completion_tokens': 0,
                    'total_tokens': 0
                }
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                **cors_headers
            },
            'body': json.dumps({'error': 'Internal server error'})
        }

def handle_chat_completion(messages: List[Dict[str, Any]]) -> str:
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        bedrock_runtime = boto3.client('bedrock-runtime')
        model_id = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
        
        # Convertir mensajes al formato de Claude
        claude_messages = []
        for msg in messages:
            claude_message = {
                "role": msg["role"],
                "content": []
            }
            
            # Si el contenido es string simple
            if isinstance(msg["content"], str):
                claude_message["content"].append({
                    "type": "text",
                    "text": msg["content"]
                })
            # Si el contenido incluye imágenes
            elif isinstance(msg["content"], list):
                for item in msg["content"]:
                    if item["type"] == "text":
                        claude_message["content"].append({
                            "type": "text",
                            "text": item["text"]
                        })
                    elif item["type"] == "image":
                        # Procesar imagen en base64
                        image_data = item["image"]
                        if image_data.startswith("data:"):
                            # Extraer el tipo de imagen y los datos base64
                            header, base64_data = image_data.split(",", 1)
                            media_type = header.split(":")[1].split(";")[0]
                        else:
                            # Asumir que ya es base64 puro
                            base64_data = image_data
                            media_type = "image/jpeg"  # Por defecto
                        
                        claude_message["content"].append({
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_data
                            }
                        })
            
            claude_messages.append(claude_message)
        
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": claude_messages
        }
        
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body),
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        
        if 'content' in response_body and len(response_body['content']) > 0:
            return response_body['content'][0]['text']
        else:
            return "No response from Claude"
            
    except ClientError as e:
        logger.error(f"Bedrock client error: {str(e)}")
        raise Exception(f"Failed to invoke Claude: {str(e)}")
    except Exception as e:
        logger.error(f"Error invoking Claude: {str(e)}")
        raise Exception(f"Failed to process Claude request: {str(e)}")
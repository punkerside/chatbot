import json
import logging
import os
from typing import Dict, List, Any

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

def handle_chat_completion(messages: List[Dict[str, str]]) -> str:
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        bedrock_runtime = boto3.client('bedrock-runtime')
        model_id = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
        
        last_message = messages[-1]['content'] if messages else ""
        
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": last_message
                }
            ]
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
resource "random_string" "main" {
  length  = 12
  special = false
  upper   = false
}

resource "aws_cognito_user_pool" "main" {
  name                     = var.service
  auto_verified_attributes = []

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  verification_message_template {
    email_message = "Your verification code is {####}"
    email_subject = "Verify your account"
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name                          = var.service
  user_pool_id                  = aws_cognito_user_pool.main.id
  prevent_user_existence_errors = "ENABLED"
  access_token_validity         = 720
  id_token_validity             = 720
  refresh_token_validity        = 30

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = var.service
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    provider_name = aws_cognito_user_pool.main.endpoint
    client_id     = aws_cognito_user_pool_client.main.id
  }
}

resource "aws_iam_role" "cognito_auth_role" {
  name = "${var.service}-auth"

  assume_role_policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "cognito-identity.amazonaws.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "cognito-identity.amazonaws.com:aud": aws_cognito_identity_pool.main.id
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "auth_role_policy" {
  role       = aws_iam_role.cognito_auth_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonCognitoPowerUser"
}

resource "aws_iam_role" "cognito_unauth_role" {
  name = "${var.service}-unauth"

  assume_role_policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "cognito-identity.amazonaws.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "cognito-identity.amazonaws.com:aud": aws_cognito_identity_pool.main.id
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "unauth_role_policy" {
  role       = aws_iam_role.cognito_unauth_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonCognitoPowerUser"
}

resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated   = aws_iam_role.cognito_auth_role.arn
    unauthenticated = aws_iam_role.cognito_unauth_role.arn
  }
}

resource "aws_cloudwatch_log_group" "main" {
  name              = "/aws/lambda/${var.service}"
  retention_in_days = 30
}

resource "aws_iam_role" "main" {
  name = var.service

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["lambda.amazonaws.com"]
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "main" {
  name = var.service
  role = aws_iam_role.main.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:${data.aws_region.main.region}:${data.aws_caller_identity.main.account_id}:log-group:/aws/lambda/${var.service}",
        "arn:aws:logs:${data.aws_region.main.region}:${data.aws_caller_identity.main.account_id}:log-group:/aws/lambda/${var.service}:log-stream:*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_s3_bucket" "main" {
  bucket        = "${var.service}-${random_string.main.result}"
  force_destroy = true

  lifecycle {
    ignore_changes = [
      tags["CreatorId"], tags["CreatorName"],
    ]
  }
}

resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.main.bucket

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "${aws_s3_bucket.main.arn}/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "${data.aws_caller_identity.main.account_id}"
        },
        "ArnLike": {
          "aws:SourceArn": "arn:aws:bedrock:${data.aws_region.main.region}:${data.aws_caller_identity.main.account_id}:*"
        }
      }
    }
  ]
}
EOF
}

resource "aws_bedrock_model_invocation_logging_configuration" "main" {
  depends_on = [
    aws_s3_bucket_policy.main
  ]

  logging_config {
    embedding_data_delivery_enabled = false
    image_data_delivery_enabled     = true
    text_data_delivery_enabled      = true
    video_data_delivery_enabled     = true

    s3_config {
      bucket_name = aws_s3_bucket.main.id
      key_prefix  = "bedrock"
    }
  }
}

resource "aws_lambda_function" "main" {
  function_name    = var.service
  role             = aws_iam_role.main.arn
  handler          = "main.lambda_handler"
  filename         = data.archive_file.main.output_path
  source_code_hash = data.archive_file.main.output_base64sha256
  runtime          = "python3.13"
  memory_size      = 512
  timeout          = 60

  environment {
    variables = {
      BEDROCK_MODEL_ID = var.bedrock_model_id
    }
  }
}

resource "aws_api_gateway_rest_api" "main" {
  name        = var.service

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_authorizer" "main" {
  name                    = var.service
  rest_api_id             = aws_api_gateway_rest_api.main.id
  type                    = "COGNITO_USER_POOLS"
  identity_source         = "method.request.header.Authorization"
  provider_arns           = [aws_cognito_user_pool.main.arn]
}

resource "aws_api_gateway_resource" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = var.service
}

resource "aws_api_gateway_method" "main" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.main.id
  http_method   = "POST"
  authorization = "NONE"
  # authorizer_id = aws_api_gateway_authorizer.main.id
}

resource "aws_api_gateway_integration" "main" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.main.id
  http_method             = aws_api_gateway_method.main.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.main.invoke_arn
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeploy = timestamp()
  }

  depends_on = [ 
    aws_api_gateway_integration.main
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  deployment_id        = aws_api_gateway_deployment.main.id
  rest_api_id          = aws_api_gateway_rest_api.main.id
  stage_name           = "prd"
  xray_tracing_enabled = false
}

resource "aws_lambda_permission" "main" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_api_gateway_resource" "cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "{cors+}"
}

resource "aws_api_gateway_method" "cors" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.cors.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.cors.id
  http_method = aws_api_gateway_method.cors.http_method
  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.cors.id
  http_method = aws_api_gateway_method.cors.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true,
    "method.response.header.Access-Control-Allow-Methods" = true,
    "method.response.header.Access-Control-Allow-Headers" = true
  }

  depends_on = [aws_api_gateway_method.cors]
}

resource "aws_api_gateway_integration_response" "cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.cors.id
  http_method = aws_api_gateway_method.cors.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'",
    "method.response.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET, POST, DELETE, OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.cors, aws_api_gateway_method_response.cors]
}

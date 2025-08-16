resource "random_string" "main" {
  length  = 12
  special = false
  upper   = false
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
      BEDROCK_MODEL_ID = var.claude_model_id
    }
  }
}
data "aws_region" "main" {}
data "aws_caller_identity" "main" {}

data "archive_file" "main" {
  type        = "zip"
  source_dir  = "${path.module}/../api/"
  output_path = "${path.module}/app.zip"
}
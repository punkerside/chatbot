export SERVICE            = chatbot
export AWS_DEFAULT_REGION = us-east-1

init:
	@cd terraform/ && terraform init

apply:
	@cd terraform/ && terraform apply -var="service=${SERVICE}"
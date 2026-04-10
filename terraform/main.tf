terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Uncomment and configure once a GCS bucket exists for remote state
  # backend "gcs" {
  #   bucket = "<your-tf-state-bucket>"
  #   prefix = "taskpool/terraform"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  app = "taskpool"
}

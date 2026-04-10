output "vpc_id" {
  description = "VPC network ID — used by GKE and Cloud Run VPC connector"
  value       = google_compute_network.main.id
}

output "subnet_id" {
  description = "Primary subnet ID — used by GKE node pool"
  value       = google_compute_subnetwork.main.id
}

output "db_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.main.name
}

output "db_private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.main.private_ip_address
}

output "database_url" {
  description = "PostgreSQL connection string for the API (store in Secret Manager)"
  value       = "postgresql://taskpool:${var.db_password}@${google_sql_database_instance.main.private_ip_address}:5432/taskpool"
  sensitive   = true
}

output "redis_host" {
  description = "Memorystore Redis host"
  value       = google_redis_instance.main.host
}

output "redis_port" {
  description = "Memorystore Redis port"
  value       = google_redis_instance.main.port
}

output "redis_url" {
  description = "Redis connection string for the API (store in Secret Manager)"
  value       = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}"
}

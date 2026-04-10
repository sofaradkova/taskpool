# Memorystore Redis — used for Socket.io adapter and presence keys
resource "google_redis_instance" "main" {
  name           = "${local.app}-redis"
  tier           = "STANDARD_HA" # HA with automatic failover
  memory_size_gb = var.redis_memory_gb
  region         = var.region

  redis_version  = "REDIS_7_0"
  display_name   = "Taskpool Redis"

  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }
}

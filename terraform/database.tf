# Cloud SQL — PostgreSQL 15, private IP only
resource "google_sql_database_instance" "main" {
  name             = "${local.app}-postgres"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = "REGIONAL" # HA with automatic failover

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled                                  = false # no public IP
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = true

  depends_on = [google_service_networking_connection.private_services]
}

resource "google_sql_database" "taskpool" {
  name     = "taskpool"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = "taskpool"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

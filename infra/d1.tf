resource "cloudflare_d1_database" "unlocks" {
  account_id            = local.cloudflare_account_id
  name                  = "jackrhoa-unlocks"
  primary_location_hint = "enam"
}

output "unlocks_database_id" {
  value = cloudflare_d1_database.unlocks.uuid
}

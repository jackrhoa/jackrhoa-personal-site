locals {
  cloudflare_account_id = "59bb44f2e2fbd89a6c9ef05e9e168132"
}

resource "cloudflare_turnstile_widget" "email_reveal" {
  account_id      = local.cloudflare_account_id
  name            = "jackrhoa.com email reveal"
  domains         = ["jackrhoa.com", "www.jackrhoa.com"]
  mode            = "managed"
  region          = "world"
  clearance_level = "no_clearance"
}

resource "github_actions_environment_variable" "turnstile_site_key" {
  repository    = local.repository
  environment   = github_repository_environment.production.environment
  variable_name = "TURNSTILE_SITE_KEY"
  value         = cloudflare_turnstile_widget.email_reveal.sitekey
}

output "turnstile_secret" {
  value     = cloudflare_turnstile_widget.email_reveal.secret
  sensitive = true
}
